# Automated Salesforce Documentation Agent (POC)

A lightweight agent that keeps Markdown documentation for Salesforce components up to date. On each merge to `main`, it detects changed metadata, generates or updates the matching `.md` files, and opens a merge request for human review.

## Goals

- Keep component documentation current without a quarterly documentation push.
- Give new Backend and Frontend team members a readable architecture overview, reducing manual Knowledge Transfer.
- Never commit directly to `main`. Every documentation change goes through a merge request.

## Status

POC. The GitLab pipeline (`.gitlab-ci.yml`) runs on merges to `main` that change `sample-sfdx-project/force-app/`. It writes docs with GitHub Models by default (`ci/generate-docs.mjs`) or with Claude Code (`AI_PROVIDER=claude`), checks them, and opens a merge request from `docs/auto-update`. A GitHub Actions version is in `.github/workflows/salesforce-docs.yml`.

## Folder layout

```
Documentation agent/
├── README.md                  This file
├── .gitlab-ci.yml             GitLab pipeline (detect, generate, check, open MR)
├── .github/workflows/
│   └── salesforce-docs.yml    GitHub Actions version (Claude Code)
├── ci/
│   └── generate-docs.mjs      GitHub Models generator used by the GitLab pipeline
├── sample-sfdx-project/       Sample Salesforce DX project the agent documents
└── docs/
    ├── architecture.md        How the agent works end to end
    ├── requirements.md        Prerequisites for building the agent
    ├── decisions.md           Open decisions and their status
    ├── templates/             Documentation templates per Salesforce metadata type
    │   ├── apex-class.md
    │   ├── apex-trigger.md
    │   ├── lwc-component.md
    │   ├── custom-object.md
    │   └── flow.md
    ├── prompts/
    │   └── system-prompt.md   Instructions given to the LLM for every component
    └── sample-output/         Hand-written examples of the expected docs
```

Generated docs go to `docs/apex/`, `docs/triggers/`, `docs/lwc/`, `docs/objects/`, `docs/flows/`, and `docs/index.md`.

## CI/CD variables (GitLab)

| Variable | Needed for | Value |
|---|---|---|
| `GITHUB_MODELS_TOKEN` | `AI_PROVIDER=github-models` | GitHub fine-grained PAT with "Models: Read" |
| `ANTHROPIC_API_KEY` | `AI_PROVIDER=claude` | Anthropic API key with a spend limit |
| `GITLAB_PUSH_TOKEN` | Opening the merge request | Project access token, role Developer, scope `write_repository` |

Mark all three Masked and Protected.

## Running it

- Automatic: merge a change under `sample-sfdx-project/force-app/` into `main`.
- Manual: Build > Pipelines > Run pipeline on `main`. Set `DRY_RUN=true` to skip the merge request and inspect the docs in the job artifacts, and `FROM_REF` to choose the starting commit.
