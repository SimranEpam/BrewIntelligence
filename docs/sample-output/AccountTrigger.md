# AccountTrigger

> Auto-generated from `sample-sfdx-project/force-app/main/default/triggers/AccountTrigger.trigger`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Apex trigger |
| Object | Account |
| Events | before insert, before update |
| Last changed | Not available (no git history) |

## Purpose

Fills in a default Industry ("Other") on Account records that are saved without one.

## Handler

- Trigger handler class: Logic inline in trigger (no handler class)
- Framework used: None

## Execution order

1. Before-save flows on Account (none found in this project)
2. This trigger
3. System validation rules and standard save logic

## Logic by event

| Event | What happens |
|---|---|
| before insert | For each new Account with a blank Industry, sets Industry to "Other". |
| before update | Same logic as before insert: sets Industry to "Other" when blank. |

## Dependencies

- **Objects and fields:** Account.Industry
- **Apex classes called:** None

## Salesforce considerations

- Bulkification: Yes. Loops over `Trigger.new`, with no SOQL or DML.
- Recursion protection: None found. The trigger does not run DML, so recursion is not expected from this trigger alone.
- Governor limits: None found.

## Tests

- Test class: None found for this trigger. `AccountServiceTest` does not exercise it.

## Change history

Not available (no git history in the sample project).

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

