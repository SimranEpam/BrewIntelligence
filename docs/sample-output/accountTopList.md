# accountTopList (LWC)

> Auto-generated from `sample-sfdx-project/force-app/main/default/lwc/accountTopList/`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Lightning Web Component |
| Exposed to | Record Page, App Page, Home Page |
| Target object | N/A |
| Last changed | Not available (no git history) |

## Purpose

Shows a card listing the accounts with the highest annual revenue, using `AccountService.getTopAccounts`.

## Public properties

| Name | Type | Default | Purpose |
|---|---|---|---|
| recordLimit | `@api` Integer | 5 | Number of accounts to show. Editable in App Builder on the Home Page target. |

## Events

- **Dispatched:** None
- **Handled:** None

## Data sources

- Apex methods called: `AccountService.getTopAccounts`
- Wire adapters: `@wire(getTopAccounts)`, with `limitCount` bound to `recordLimit`
- Base LDS (`lightning/uiRecordApi`): No

## Child components

None

## Accessibility and UX notes

- Shows an error message when the Apex call fails.
- The list is plain text in a `ul`. Not reviewed for screen reader behaviour.

## Tests

- Jest tests: None found

## Change history

Not available (no git history in the sample project).

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

