# Architecture

## Pipeline

```
Merge to main
   │
   ▼
1. Detect changes        git diff between before/after SHA
                         (sfdx-git-delta limits this to Salesforce metadata)
   │
   ▼
2. Classify components   Map each changed file to a component type
                         (Apex class, trigger, LWC, custom object, flow, ...)
   │
   ▼
3. Gather context        Read the source, its -meta.xml, and the objects,
                         fields, and classes it references
   │
   ▼
4. Generate docs         For each component: fill the matching template
                         using prompts/system-prompt.md
   │
   ▼
5. Write files           Create or update docs/<type>/<Name>.md,
                         keeping the "Manual notes" section unchanged
   │
   ▼
6. Open pull request     Branch docs/auto-update → PR to main
                         A human reviews and merges
```

## Metadata to file path mapping

| Salesforce metadata | Source files in repo | Output doc |
|---|---|---|
| Apex class | `classes/*.cls` | `docs/apex/<Name>.md` |
| Apex trigger | `triggers/*.trigger` | `docs/triggers/<Name>.md` |
| LWC | `lwc/<name>/*` | `docs/lwc/<name>.md` |
| Custom object | `objects/<Obj>/*.object-meta.xml` | `docs/objects/<Obj>.md` |
| Flow | `flows/*.flow-meta.xml` | `docs/flows/<Name>.md` |

Index pages (`docs/index.md`, object relationship diagram) are regenerated from the component docs on each run.

## Guardrails

- Scan generated text for secrets, tokens, and hardcoded record IDs before writing.
- Skip or truncate files above a size limit and note the truncation in the doc.
- Enforce a per-run token and cost cap.
- Provide a dry-run mode that prints output instead of writing files.
- Never edit content inside the "Manual notes" section of an existing doc.

## Models

- `claude-sonnet-5-5`: default for component documentation.
- `claude-haiku-5-5`: optional, for summarising very large files.
