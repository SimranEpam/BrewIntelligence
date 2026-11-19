# Open Decisions

| # | Decision | Options | Recommendation | Status |
|---|---|---|---|---|
| 1 | Implementation language | Node.js / Python | Node.js (native `sf` CLI tooling) | Open |
| 2 | Where docs live | Same repo (`docs/`) / separate docs repo | Same repo, so docs change with code | Open |
| 3 | Model for generation | `claude-sonnet-5-5` / `claude-haiku-5-5` | Sonnet for quality; Haiku for very large files | Open |
| 4 | POC metadata scope | Apex only / Apex + objects / + LWC / + flows | Apex, objects, LWC | Open |
| 5 | Doc template approval | Team review required | Agree on templates before automation | Open |
| 6 | Trigger | Every merge to `main` / scheduled nightly | Every merge to `main` | Open |
