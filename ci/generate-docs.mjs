#!/usr/bin/env node
// Salesforce documentation generator using GitHub Models.
//
// One document per MODULE (docs/modules/<module>.md). A module groups any
// number of Apex classes, triggers, LWCs, objects, and flows, as declared in
// docs/modules.json.
//
// Reads the change list written by the pipeline (.sgd/changed-files.txt),
// maps every changed component to its module, and for each affected module
// builds one request (all module sources + template + system prompt), calls
// the GitHub Models chat completions API, and writes docs/modules/<id>.md.
// Then regenerates docs/index.md.
//
// The model only writes the body of each doc. This script:
//   - decides which modules to update (from file paths and the manifest)
//   - restores the existing "## Manual notes" section byte for byte
//   - marks the doc of a module whose components were all removed as deprecated
//   - builds docs/index.md and the object relationship diagram itself
//
// Components not listed in docs/modules.json go to the "unassigned" module,
// so nothing is silently dropped.
//
// No dependencies; needs Node 20+ (global fetch).
//
// Environment:
//   GITHUB_MODELS_TOKEN  GitHub token with the "Models: Read" permission (required)
//   MODEL                GitHub Models id, e.g. openai/gpt-4.1 (default)
//   SOURCE_DIR           e.g. sample-sfdx-project/force-app
//   TO                   commit SHA being documented (for deprecation notes)
//   MAX_CONTEXT_CHARS    total characters of source sent per module (default 30000)
//   MODULES_FILE         module manifest (default docs/modules.json)
//   MODELS_ENDPOINT      override the API URL (used for local testing)
//   PROMPT_ONLY=true     print prompts instead of calling the API (no token needed)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const env = process.env;
const SOURCE_DIR = (env.SOURCE_DIR || "sample-sfdx-project/force-app").replace(/\\/g, "/");
const MODEL = env.MODEL || "openai/gpt-4.1";
const TO = env.TO || "HEAD";
const MAX_CONTEXT_CHARS = Number(env.MAX_CONTEXT_CHARS || 30000);
const ENDPOINT = env.MODELS_ENDPOINT || "https://models.github.ai/inference/chat/completions";
const PROMPT_ONLY = env.PROMPT_ONLY === "true";
const CHANGES_FILE = ".sgd/changed-files.txt";
const MODULES_FILE = env.MODULES_FILE || "docs/modules.json";
const MODULES_DIR = "docs/modules";
const MODULE_TEMPLATE = "docs/templates/module.md";
const MANUAL_HEADING = "## Manual notes";

const UNASSIGNED = {
  id: "unassigned",
  title: "Unassigned components",
  description: `Components not listed in ${MODULES_FILE}. Add them to a module to group them.`,
  patterns: [],
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
    for (const [, file] of entries) {
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
      if (!components.has(key)) components.set(key, { ...c });
    }
  }
  for (const c of components.values()) c.deleted = !mainSource(c).some(exists);
  return [...components.values()];
}

// Every component currently in the repo (test classes excluded).
function allComponents() {
  const seen = new Map();
  for (const file of listFiles(SOURCE_DIR)) {
    const c = classify(file);
    if (!c || (c.type === "apex-class" && /Test$/.test(c.name))) continue;
    const key = `${c.type}:${c.name}`;
    if (!seen.has(key)) seen.set(key, { ...c, deleted: false });
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------- modules

const globToRegExp = (g) =>
  new RegExp(`^${g.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);

// docs/modules.json:
//   { "modules": { "<id>": { "title": "...", "description": "...",
//                            "components": ["apex-class:AccountService", "lwc:account*"] } } }
// Component keys are "<type>:<name>" with "*" wildcards. First matching module wins.
function loadManifest() {
  if (!exists(MODULES_FILE)) throw new Error(`${MODULES_FILE} not found`);
  const modules = JSON.parse(read(MODULES_FILE)).modules || {};
  return Object.entries(modules).map(([id, def]) => ({
    id,
    title: def.title || id,
    description: def.description || "",
    patterns: (def.components || []).map(globToRegExp),
  }));
}

function planModules(manifest, changed) {
  const slots = new Map(); // module id -> { mod, components: Map<key, component> }
  const slot = (mod) => {
    if (!slots.has(mod.id)) slots.set(mod.id, { mod, components: new Map() });
    return slots.get(mod.id);
  };
  const moduleOf = (c) =>
    manifest.find((m) => m.patterns.some((re) => re.test(`${c.type}:${c.name}`))) ?? UNASSIGNED;

  for (const c of allComponents()) slot(moduleOf(c)).components.set(`${c.type}:${c.name}`, { ...c, changed: false });
  for (const c of changed) {
    const s = slot(moduleOf(c));
    const key = `${c.type}:${c.name}`;
    s.components.set(key, { ...(s.components.get(key) ?? c), deleted: c.deleted, changed: true });
  }
  // Only modules with at least one changed component are regenerated.
  return [...slots.values()].filter((s) => [...s.components.values()].some((c) => c.changed));
}

// ---------------------------------------------------------------- context

const mainFirst = (files, suffix) =>
  [...files].sort((a, b) => Number(b.endsWith(suffix)) - Number(a.endsWith(suffix)));

function mainSource({ type, root, name }) {
  switch (type) {
    case "apex-class":    return [`${root}/classes/${name}.cls`, `${root}/classes/${name}.cls-meta.xml`];
    case "apex-trigger":  return [`${root}/triggers/${name}.trigger`, `${root}/triggers/${name}.trigger-meta.xml`];
    // Main file first, so it is read before helper files.
    case "lwc":           return mainFirst(listFiles(`${root}/lwc/${name}`).filter((f) => !f.includes("/__tests__/")), `/${name}.js`);
    case "custom-object": return mainFirst(listFiles(`${root}/objects/${name}`), `/${name}.object-meta.xml`);
    case "flow":          return [`${root}/flows/${name}.flow-meta.xml`];
  }
  return [];
}

// Field summary of every object that the module's source names.
function objectSummaries(root, ownObjects, sourceText) {
  const objects = exists(`${root}/objects`) ? fs.readdirSync(`${root}/objects`) : [];
  return objects
    .filter((o) => !ownObjects.has(o) && new RegExp(`\\b${o}\\b`).test(sourceText))
    .map((o) => {
      const fields = listFiles(`${root}/objects/${o}/fields`).map((f) => path.basename(f).replace(".field-meta.xml", ""));
      return `- ${o}: fields ${fields.join(", ") || "none in repo"}`;
    });
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

// One cheap call before any module: fail once with a clear reason
// instead of failing every module with the same error.
async function preflight() {
  if (!env.GITHUB_MODELS_TOKEN) throw new Error("GITHUB_MODELS_TOKEN is not set for this job");
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
  let models;
  try {
    models = parseJson(res, body);
  } catch (err) {
    // The catalog is only a pre-check; if something other than the API answered,
    // let the real model call decide and report its own error.
    console.warn(`preflight: catalog response is not JSON, skipping the model check and continuing\n  ${describe(res, body)}`);
    return;
  }
  if (Array.isArray(models) && !models.some((m) => m.id === MODEL)) {
    const sample = models.map((m) => m.id).slice(0, 15).join(", ");
    throw new Error(`Model "${MODEL}" is not in your GitHub Models catalog. Set MODEL to one of: ${sample}${models.length > 15 ? ", ..." : ""}`);
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

// ---------------------------------------------------------------- per module

async function documentModule({ mod, components }, systemPrompt) {
  const comps = [...components.values()];
  const live = comps.filter((c) => !c.deleted);
  const outPath = `${MODULES_DIR}/${mod.id}.md`;
  const existing = exists(outPath) ? read(outPath) : null;

  if (!live.length) {
    if (!existing) return console.log(`skip module ${mod.id}: all components removed and never documented`);
    if (existing.includes("> **Deprecated:**")) return;
    const note = `> **Deprecated:** all components removed in ${TO}.`;
    fs.writeFileSync(outPath, existing.replace(/^(# .*\n)/, `$1\n${note}\n`));
    return console.log(`deprecated ${outPath}`);
  }

  const templateText = read(MODULE_TEMPLATE);
  const [, templateManual] = splitManualNotes(templateText);
  const [existingBody, existingManual] = existing ? splitManualNotes(existing) : [null, null];
  const manual = existingManual ?? templateManual ?? `${MANUAL_HEADING}\n`;

  const filesOf = (c) => {
    const files = mainSource(c).filter(exists).map((p) => ({ path: p }));
    if (c.type === "apex-class") {
      const test = `${c.root}/classes/${c.name}Test.cls`;
      if (exists(test)) files.push({ path: test, note: "test class" });
    }
    return files;
  };
  const changedFiles = live.filter((c) => c.changed).flatMap(filesOf);
  const unchangedFiles = live.filter((c) => !c.changed).flatMap(filesOf);

  // Changed components get the largest share; unchanged ones are context only.
  const existingBudget = existingBody ? Math.floor(MAX_CONTEXT_CHARS * 0.2) : 0;
  const changedBudget = Math.floor(MAX_CONTEXT_CHARS * 0.5);
  const unchangedBudget = MAX_CONTEXT_CHARS - existingBudget - changedBudget;

  const allText = [...changedFiles, ...unchangedFiles].map((f) => read(f.path)).join("\n");
  const ownObjects = new Set(live.filter((c) => c.type === "custom-object").map((c) => c.name));
  const summaries = new Set();
  for (const root of new Set(live.map((c) => c.root))) {
    for (const s of objectSummaries(root, ownObjects, allText)) summaries.add(s);
  }

  const status = (c) => (c.deleted ? "removed in this change" : c.changed ? "changed in this change" : "unchanged");
  const history = live
    .filter((c) => c.changed)
    .map((c) => `### ${c.name}\n${gitHistory(mainSource(c).filter(exists))}`)
    .join("\n\n");

  const user = [
    `module_id: ${mod.id}`,
    `module_title: ${mod.title}`,
    `module_description: ${mod.description || "Not available"}`,
    "",
    "## components",
    comps.map((c) => `- ${c.type} ${c.name}: ${status(c)}`).join("\n"),
    "",
    "## changed_component_sources",
    packFiles(changedFiles, changedBudget) || "None",
    "",
    "## unchanged_component_sources",
    packFiles(unchangedFiles, unchangedBudget) || "None",
    summaries.size ? `\nReferenced objects:\n${[...summaries].join("\n")}` : "",
    "",
    "## git_history (changed components)",
    history || "Not available",
    "",
    "## existing_doc (current document; keep text about unchanged components)",
    existingBody ? `\`\`\`markdown\n${existingBody.slice(0, existingBudget)}\n\`\`\`` : "None (first version of this module document)",
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
  fs.mkdirSync(MODULES_DIR, { recursive: true });
  fs.writeFileSync(outPath, `${body.trimEnd()}\n\n${manual.trimEnd()}\n`);
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
  const out = [
    "# Salesforce module index",
    "",
    "> Auto-generated by the documentation agent. Do not edit by hand.",
    "",
  ];
  const docs = listFiles(MODULES_DIR).filter((f) => f.endsWith(".md")).sort();
  if (docs.length) {
    out.push("## Modules", "", "| Module | Summary |", "|---|---|");
    for (const f of docs) {
      const text = read(f);
      const title = text.match(/^# (.+)$/m)?.[1] || path.basename(f, ".md");
      const deprecated = text.includes("> **Deprecated:**") ? " (deprecated)" : "";
      out.push(`| [${title}](${path.posix.relative("docs", f)})${deprecated} | ${purposeLine(text) || "Not available"} |`);
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

const plan = planModules(loadManifest(), readChanges());
for (const { mod, components } of plan) {
  console.log(`module ${mod.id}: ${[...components.values()].map((c) => `${c.type}:${c.name}${c.deleted ? " (removed)" : c.changed ? " (changed)" : ""}`).join(", ")}`);
  if (mod === UNASSIGNED) console.warn(`::warning::Components in "unassigned" are not listed in ${MODULES_FILE}; add them to a module.`);
}
if (!plan.length) console.log("modules: none affected");

if (!PROMPT_ONLY && plan.some(({ components }) => [...components.values()].some((c) => !c.deleted))) {
  try {
    await preflight();
  } catch (err) {
    console.error(`ERROR preflight: ${err.message}`);
    process.exit(1);
  }
}

let failed = 0;
for (const entry of plan) {
  try {
    await documentModule(entry, systemPrompt);
  } catch (err) {
    failed++;
    console.error(`ERROR module ${entry.mod.id}: ${err.message}`);
  }
}
if (!PROMPT_ONLY) writeIndex();
if (failed) {
  console.error(`${failed} module(s) failed`);
  process.exit(1);
}
