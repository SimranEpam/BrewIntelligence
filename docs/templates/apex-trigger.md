# {{TriggerName}}

> Auto-generated from `{{source_path}}`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Apex trigger |
| Object | {{ObjectName}} |
| Events | {{before insert, after update, ...}} |
| Last changed | {{last_commit_date}} by {{last_commit_author}} |

## Purpose

{{One paragraph: what business rule or automation this trigger enforces.}}

## Handler

- Trigger handler class: {{ClassName or "Logic inline in trigger"}}
- Framework used: {{e.g. trigger handler pattern, or "None"}}

## Execution order

1. {{Validation rules, flows, or other triggers that also run on this object}}
2. {{...}}

## Logic by event

| Event | What happens |
|---|---|
| {{before insert}} | {{summary}} |

## Dependencies

- **Objects and fields:** {{Object.Field list}}
- **Apex classes called:** {{ClassName list}}

## Salesforce considerations

- Bulkification: {{Yes / No / Partial, with reason}}
- Recursion protection: {{Static flag, or "None found"}}
- Governor limits: {{SOQL/DML inside loops, or "None found"}}

## Tests

- Test class: {{ClassName or "None found"}}

## Change history

{{Last 3 commits touching this file}}

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

