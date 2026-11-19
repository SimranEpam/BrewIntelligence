# Invoice Validate Amount (`Invoice_Validate_Amount`)

> Auto-generated from `sample-sfdx-project/force-app/main/default/flows/Invoice_Validate_Amount.flow-meta.xml`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Record-triggered, before save |
| Object | Invoice__c |
| Trigger conditions | Record created or updated |
| Status | Active |
| Last changed | Not available (no git history) |

## Purpose

Checks each invoice before it is saved. It blocks an amount of zero or less, and sets the status to Draft when none is given.

## Entry criteria

Every create or update of an `Invoice__c` record.

## Steps

1. **Check Amount** (decision): is `Amount__c` less than or equal to 0?
   - Yes: go to **Show Amount Error**.
   - No: go to **Check Status**.
2. **Show Amount Error** (custom error): blocks the save with "Amount must be greater than zero." The error is shown on the Amount field.
3. **Check Status** (decision): is `Status__c` blank?
   - Yes: go to **Set Default Status**.
   - No: the flow ends.
4. **Set Default Status** (assignment): sets `Status__c` to `Draft`.

## Decisions and branches

| Decision | Condition | Outcome |
|---|---|---|
| Check Amount | Amount__c <= 0 | Show Amount Error (blocks save) |
| Check Amount | Otherwise | Check Status |
| Check Status | Status__c is blank | Set Default Status |
| Check Status | Otherwise | End |

## Data operations

- Record creates: None
- Record updates: None. Changes are made to the triggering record before save, with no separate DML.
- Record deletes: None

## Dependencies

- Apex actions called: None
- Subflows called: None
- Email alerts or platform events: None

## Salesforce considerations

- Bulkification: Yes. Before-save flows run per record with no queries or DML.
- Fault handling: No fault paths. The flow has no elements that can fail, so none are needed.

## Change history

Not available (no git history in the sample project).

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

