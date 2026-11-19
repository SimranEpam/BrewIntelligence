# Requirements

## Repositories and access

- [ ] Salesforce DX repository to document (`sfdx-project.json`, `force-app/`)
- [ ] GitHub repository for the agent, with Actions enabled
- [ ] Permission to add workflows, GitHub Secrets, and PR branches
- [ ] Branch protection on `main` reviewed (agent PRs need an approver)

## Credentials

- [ ] Anthropic API key with a spend limit, stored as the GitHub secret `ANTHROPIC_API_KEY`
- [ ] No Salesforce org credentials required (metadata is read from the repo)

## Local tools

- [ ] Node.js 20+ or Python 3.11+
- [ ] Git
- [ ] Salesforce CLI (`sf`)
- [ ] `sfdx-git-delta` plugin (`sf plugins install sfdx-git-delta`)

## Scope for the POC

- Apex classes and triggers
- Custom objects
- Lightweight Web Components (LWC)
- Flows are deferred to a later phase

## Success criteria

- A reviewer judges most generated docs accurate.
- Documentation cost per merge stays within the agreed cap.
- No secrets or record IDs appear in committed docs.
