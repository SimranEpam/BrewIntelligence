#!/usr/bin/env node
// Salesforce documentation generator using GitHub Models.
//
// Reads the change list written by the pipeline (.sgd/changed-files.txt),
// builds one request per changed component (source + related metadata +
// template + system prompt), calls the GitHub Models chat completions API,
// and writes docs/<type>/<Name>.md. Then regenerates docs/index.md.
//
// The model only writes the body of each doc. This script:
//   - restores the existing "## Manual notes" section byte for byte
//   - marks docs of deleted components as deprecated (no model call)
//   - builds docs/index.md and the object relationship diagram itself
//
// No dependencies; needs Node 20+ (global fetch).
//
// Environment:
//   GITHUB_MODELS_TOKEN  GitHub PAT with the "Models: Read" permission (required)
//   MODEL                GitHub Models id, e.g. openai/gpt-4.1 (default)
//   SOURCE_DIR           e.g. sample-sfdx-project/force-app
//   TO                   commit SHA being documented (for deprecation notes)
//   MAX_CONTEXT_CHARS    total characters of source sent per component (default 20000)
//   MODELS_ENDPOINT      override the API URL (used for local testing)
//   PROMPT_ONLY=true     print prompts instead of calling the API (no token needed)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const env = process.env;
const SOURCE_DIR = (env.SOURCE_DIR || "sample-sfdx-project/force-app").replace(/\\/g, "/");
const MODEL = env.MODEL || "openai/gpt-4.1";
const TO = env.TO || "HEAD";
const MAX_CONTEXT_CHARS = Number(env.MAX_CONTEXT_CHARS || 20000);
const ENDPOINT = env.MODELS_ENDPOINT || "https://models.github.ai/inference/chat/completions";
const PROMPT_ONLY = env.PROMPT_ONLY === "true";
const CHANGES_FILE = ".sgd/changed-files.txt";
const MANUAL_HEADING = "## Manual notes";

const TYPES = {
  "apex-class":    { template: "apex-class.md",    outDir: "docs/apex" },
  "apex-trigger":  { template: "apex-trigger.md",  outDir: "docs/triggers" },
  "lwc":           { template: "lwc-component.md", outDir: "docs/lwc" },
  "custom-object": { template: "custom-object.md", outDir: "docs/objects" },
  "flow":          { template: "flow.md",          outDir: "docs/flows" },
};

// ---------------------------------------------------------------- helpers

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const posix = (p) => p.replace(/\\/g, "/");

function listFiles(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = posix(path.join(dir, e.name));
    return e.isDirectory() ? listFiles(p) : [p];
  });
}

function gitHistory(paths) {
  try {
    return execFileSync(
      "git",
      ["log", "-3", "--format=%h %ad %an: %s", "--date=short", "--", ...paths],
      { encoding: "utf8" },
    ).trim() || "Not available";
  } catch {
    return "Not available";
  }
}

// Split a doc into [body, manualNotes]; manualNotes runs to end of file.
function splitManualNotes(text) {
  const i = text.search(/^## Manual notes/m);
  return i === -1 ? [text, null] : [text.slice(0, i), text.slice(i)];
}

// ---------------------------------------------------------------- classify

// Map a changed file path to { type, name, root } where root is the
// metadata folder that contains classes/, triggers/, lwc/, ...
function classify(file) {
  const rules = [
    { type: "apex-class",    re: /^(.*)\/classes\/([^/]+)\.cls(?:-meta\.xml)?$/ },
    { type: "apex-trigger",  re: /^(.*)\/triggers\/([^/]+)\.trigger(?:-meta\.xml)?$/ },
    { type: "lwc",           re: /^(.*)\/lwc\/([^/.][^/]*)\/.+$/ },
    { type: "custom-object", re: /^(.*)\/objects\/([^/]+)\/.+$/ },
    { type: "flow",          re: /^(.*)\/flows\/([^/]+)\.flow-meta\.xml$/ },
  ];
  for (const { type, re } of rules) {
    const m = file.match(re);
    if (m) return { type, root: m[1], name: m[2] };
  }
  return null;
}

function readChanges() {
  if (!exists(CHANGES_FILE)) throw new Error(`${CHANGES_FILE} not found`);
  const components = new Map();
  for (const line of read(CHANGES_FILE).split(/\r?\n/).filter(Boolean)) {
    const parts = line.split("\t");
    const status = parts[0][0];
    // Renames list old and new path; treat as delete of old + add of new.
    const entries = status === "R" ? [["D", parts[1]], ["A", parts[2]]] : [[status, parts[1]]];
    for (const [st, file] of entries) {
      const c = classify(posix(file));
      if (!c) continue;
      if (c.type === "apex-class" && /Test$/.test(c.name)) {
        // Test classes are documented through the class they test.
        const target = c.name.replace(/Test$/, "");
        if (exists(`${c.root}/classes/${target}.cls`) && !components.has(`apex-class:${target}`)) {
          components.set(`apex-class:${target}`, { type: "apex-class", root: c.root, name: target });
        }
        continue;
      }
      const key = `${c.type}:${c.name}`;
      if (!components.has(key)) components.set(key, { ...c, touched: [] });
      components.get(key).touched?.push(st);
    }
  }
  for (const c of components.values()) c.deleted = !mainSource(c).some(exists);
  return [...components.values()];
}

// ---------------------------------------------------------------- context

const mainFirst = (files, suffix) =>
  [...files].sort((a, b) => Number(b.endsWith(suffix)) - Number(a.endsWith(suffix)));

function mainSource({ type, root, name }) {
  switch (type) {
    case "apex-class":    return [`${root}/classes/${name}.cls`, `${root}/classes/${name}.cls-meta.xml`];
    case "apex-trigger":  return [`${root}/triggers/${name}.trigger`, `${root}/triggers/${name}.trigger-meta.xml`];
    // Main file first, so source_path points at it.
    case "lwc":           return mainFirst(listFiles(`${root}/lwc/${name}`).filter((f) => !f.includes("/__tests__/")), `/${name}.js`);
    case "custom-object": return mainFirst(listFiles(`${root}/objects/${name}`), `/${name}.object-meta.xml`);
    case "flow":          return [`${root}/flows/${name}.flow-meta.xml`];
  }
  return [];
}

// Files referenced by the component: Apex classes it calls, its test class,
// Jest tests, and a field summary of every object it names.
function relatedMetadata(c, sourceText) {
  const { root, name, type } = c;
  const related = [];
  const classes = listFiles(`${root}/classes`).filter((f) => f.endsWith(".cls"));
  const objects = exists(`${root}/objects`) ? fs.readdirSync(`${root}/objects`) : [];

  for (const f of classes) {
    const cls = path.basename(f, ".cls");
    if (type === "apex-class" && cls === name) continue;
    const isTest = cls === `${name}Test`;
    const referenced = new RegExp(`\\b${cls}\\b`).test(sourceText);
    if (isTest || referenced) related.push({ path: f, note: isTest ? "test class" : "referenced class" });
  }
  if (type === "lwc") {
    for (const f of listFiles(`${root}/lwc/${name}/__tests__`)) related.push({ path: f, note: "Jest test" });
  }
  if (type === "apex-class" || type === "apex-trigger") {
    // Triggers that call this class, so "Entry points" can be filled.
    for (const f of listFiles(`${root}/triggers`).filter((f) => f.endsWith(".trigger"))) {
      if (type === "apex-class" && new RegExp(`\\b${name}\\b`).test(read(f))) {
        related.push({ path: f, note: "trigger that calls this class" });
      }
    }
  }
  if (type === "custom-object") {
    for (const f of [...listFiles(`${root}/triggers`), ...listFiles(`${root}/flows`)]) {
      if (/\.(trigger|flow-meta\.xml)$/.test(f) && read(f).includes(name)) {
        related.push({ path: f, note: "automation on this object (name match)" });
      }
    }
  }
  const objectSummaries = objects
    .filter((o) => o !== name && new RegExp(`\\b${o}\\b`).test(sourceText))
    .map((o) => {
      const fields = listFiles(`${root}/objects/${o}/fields`).map((f) => path.basename(f).replace(".field-meta.xml", ""));
      return `- ${o}: fields ${fields.join(", ") || "none in repo"}`;
    });
  return { related, objectSummaries };
}

// Concatenate files ({ path, note? }), spending at most `budget` characters in total.
function packFiles(files, budget) {
  let left = budget;
  const out = [];
  for (const { path: f, note } of files) {
    if (!exists(f)) continue;
    const text = read(f);
    const label = note ? `${f} (${note})` : f;
    const body = text.length <= left ? text : `${text.slice(0, Math.max(0, left))}\n[TRUNCATED: ${left} of ${text.length} characters included]`;
    left = Math.max(0, left - text.length);
    out.push(`### ${label}\n\`\`\`\n${body}\n\`\`\``);
  }
  return out.join("\n\n");
}

// ---------------------------------------------------------------- model call

const API_HEADERS = () => ({
  Authorization: `Bearer ${env.GITHUB_MODELS_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

// Describe who actually answered, for responses that are not GitHub's API.
function describe(res, body) {
  const h = (k) => res.headers.get(k) || "-";
  return [
    `HTTP ${res.status} from ${res.url}`,
    `content-type: ${h("content-type")}, server: ${h("server")}, via: ${h("via")}, x-github-request-id: ${h("x-github-request-id")}`,
    `body (first 300 chars): ${JSON.stringify(body.slice(0, 300))}`,
  ].join("\n  ");
}

function parseJson(res, body) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `Response is not JSON, so it did not come from the GitHub Models API.\n  ${describe(res, body)}\n` +
      "  Likely cause: a proxy or firewall on the runner network answered instead of GitHub.\n" +
      "  Ask the runner admins to allow outbound HTTPS to models.github.ai.",
    );
  }
}

// One cheap call before any component: fail once with a clear reason
// instead of failing every component with the same error.
async function preflight() {
  if (!env.GITHUB_MODELS_TOKEN) throw new Error("GITHUB_MODELS_TOKEN is not set for this job (is the branch protected?)");
  const url = new URL("/catalog/models", ENDPOINT).toString();
  let res;
  try {
    res = await fetch(url, { headers: API_HEADERS() });
  } catch (err) {
    throw new Error(`Cannot reach ${url}: ${err.cause?.code || err.cause?.message || err.message}`);
  }
  const body = await res.text();
  console.log(`preflight: ${describe(res, body).split("\n")[0]}`);
  if (res.status === 401 || res.status === 403) {
    throw new Error(`GitHub rejected GITHUB_MODELS_TOKEN.\n  ${describe(res, body)}\n  Check the token has "Models: Read" and has not expired.`);
  }
  if (!res.ok) {
    // Catalog endpoint is only a check; let the real call decide.
    console.warn(`preflight: catalog check returned HTTP ${res.status}, continuing`);
    return;
  }
  const models = parseJson(res, body);
  if (Array.isArray(models) && !models.some((m) => m.id === MODEL)) {
    const sample = models.map((m) => m.id).slice(0, 15).join(", ");
    throw new Error(`Model "${MODEL}" is not in your GitHub Models catalog. Set GITHUB_MODEL to one of: ${sample}${models.length > 15 ? ", ..." : ""}`);
  }
  console.log(`preflight: GitHub Models reachable, model ${MODEL} available`);
}

async function callModel(system, user) {
  if (PROMPT_ONLY) {
    console.log(`----- prompt (${user.length} chars) -----\n${user.slice(0, 1500)}\n...`);
    return null;
  }
  const token = env.GITHUB_MODELS_TOKEN;
  if (!token) throw new Error("GITHUB_MODELS_TOKEN is not set");

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { ...API_HEADERS(), "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const body = await res.text();
    if (res.ok) {
      const data = parseJson(res, body);
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error(`Empty response: ${JSON.stringify(data).slice(0, 500)}`);
      return text;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const wait = Number(res.headers.get("retry-after")) || 15 * attempt;
      console.warn(`HTTP ${res.status}, retrying in ${wait}s (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`GitHub Models call failed.\n  ${describe(res, body)}`);
  }
}

// Remove a wrapping ```markdown fence if the model added one.
function unwrap(text) {
  const m = text.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return (m ? m[1] : text.trim()) + "\n";
}

// ---------------------------------------------------------------- per component

async function documentComponent(c, systemPrompt) {
  const { outDir, template } = TYPES[c.type];
  const outPath = `${outDir}/${c.name}.md`;
  const existing = exists(outPath) ? read(outPath) : null;

  if (c.deleted) {
    if (!existing) return console.log(`skip ${c.type} ${c.name}: deleted and never documented`);
    const note = `> **Deprecated:** source removed in ${TO}.`;
    if (existing.includes("> **Deprecated:**")) return;
    const updated = existing.replace(/^(# .*\n)/, `$1\n${note}\n`);
    fs.writeFileSync(outPath, updated);
    return console.log(`deprecated ${outPath}`);
  }

  const sources = mainSource(c).filter(exists);
  const sourceText = sources.map(read).join("\n");
  const { related, objectSummaries } = relatedMetadata(c, sourceText);
  const templateText = read(`docs/templates/${template}`);
  const [, templateManual] = splitManualNotes(templateText);
  const existingManual = existing ? splitManualNotes(existing)[1] : null;
  const manual = existingManual ?? templateManual ?? `${MANUAL_HEADING}\n`;

  const sourceBudget = Math.floor(MAX_CONTEXT_CHARS * 0.75);
  const user = [
    `component_type: ${c.type}`,
    `source_path: ${sources[0]}`,
    "",
    "## source",
    packFiles(sources.map((p) => ({ path: p })), sourceBudget),
    "",
    "## related_metadata",
    packFiles(related, MAX_CONTEXT_CHARS - sourceBudget) || "None found",
    objectSummaries.length ? `\nReferenced objects:\n${objectSummaries.join("\n")}` : "",
    "",
    "## git_history",
    gitHistory(sources),
    "",
    "## template",
    "```markdown",
    templateText,
    "```",
    "",
    "## existing_doc manual notes (copy exactly)",
    "```markdown",
    manual,
    "```",
  ].join("\n");

  const answer = await callModel(systemPrompt, user);
  if (answer === null) return;

  // Keep the model's body, force the original Manual notes section.
  const [body] = splitManualNotes(unwrap(answer));
  const doc = `${body.trimEnd()}\n\n${manual.trimEnd()}\n`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, doc);
  console.log(`wrote ${outPath}`);
}

// ---------------------------------------------------------------- index

function purposeLine(doc) {
  const m = doc.match(/^## Purpose\s*\n+([^\n#][^\n]*)/m);
  if (!m) return "";
  const s = m[1].trim().replace(/\|/g, "\\|");
  return s.length > 140 ? `${s.slice(0, 137)}...` : s;
}

// Lookup / master-detail fields from metadata (not from the model).
function relationshipEdges() {
  const edges = [];
  for (const f of listFiles(SOURCE_DIR).filter((f) => f.endsWith(".field-meta.xml"))) {
    const xml = read(f);
    const target = xml.match(/<referenceTo>([^<]+)<\/referenceTo>/)?.[1];
    if (!target) continue;
    const obj = f.match(/\/objects\/([^/]+)\//)?.[1];
    const field = path.basename(f).replace(".field-meta.xml", "");
    const kind = xml.includes("<type>MasterDetail</type>") ? "master-detail" : "lookup";
    edges.push(`    ${obj.replace(/__c$/, "")} }o--|| ${target.replace(/__c$/, "")} : "${field} (${kind})"`);
  }
  return edges;
}

function writeIndex() {
  const sections = [
    ["Apex classes", "docs/apex"],
    ["Apex triggers", "docs/triggers"],
    ["Lightning Web Components", "docs/lwc"],
    ["Custom objects", "docs/objects"],
    ["Flows", "docs/flows"],
  ];
  const out = [
    "# Salesforce component index",
    "",
    "> Auto-generated by the documentation agent. Do not edit by hand.",
    "",
  ];
  for (const [title, dir] of sections) {
    const docs = listFiles(dir).filter((f) => f.endsWith(".md")).sort();
    if (!docs.length) continue;
    out.push(`## ${title}`, "", "| Component | Summary |", "|---|---|");
    for (const f of docs) {
      const text = read(f);
      const name = path.basename(f, ".md");
      const deprecated = text.includes("> **Deprecated:**") ? " (deprecated)" : "";
      out.push(`| [${name}](${path.posix.relative("docs", f)})${deprecated} | ${purposeLine(text) || "Not available"} |`);
    }
    out.push("");
  }
  const edges = relationshipEdges();
  out.push("## Object relationships", "");
  if (edges.length) out.push("```mermaid", "erDiagram", ...edges, "```");
  else out.push("No lookup or master-detail fields found in the metadata.");
  fs.writeFileSync("docs/index.md", out.join("\n") + "\n");
  console.log("wrote docs/index.md");
}

// ---------------------------------------------------------------- main

const systemPrompt = read("docs/prompts/system-prompt.md").split(/^---$/m).slice(1).join("---").trim()
  || read("docs/prompts/system-prompt.md");

const components = readChanges();
console.log(`components: ${components.map((c) => `${c.type}:${c.name}${c.deleted ? " (deleted)" : ""}`).join(", ") || "none"}`);

if (!PROMPT_ONLY && components.some((c) => !c.deleted)) {
  try {
    await preflight();
  } catch (err) {
    console.error(`ERROR preflight: ${err.message}`);
    process.exit(1);
  }
}

let failed = 0;
for (const c of components) {
  try {
    await documentComponent(c, systemPrompt);
  } catch (err) {
    failed++;
    console.error(`ERROR ${c.type} ${c.name}: ${err.message}`);
  }
}
if (!PROMPT_ONLY) writeIndex();
if (failed) {
  console.error(`${failed} component(s) failed`);
  process.exit(1);
}
