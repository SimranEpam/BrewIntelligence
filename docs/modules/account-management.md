# Account Management

> Auto-generated from the components of module `account-management`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | account-management |
| Components | 3 (1 Apex class, 1 Apex trigger, 1 LWC) |
| Last changed | 2026-11-26 by Yaswanth Tikkisetti |

## Purpose

This module updates `Account.Rating` based on `Account.AnnualRevenue`, retrieves top accounts for an LWC, and sets a default `Account.Industry` value when an Account is created or updated.

## Components

| Component | Type | Purpose |
|---|---|---|
| AccountService | Apex class | Updates Account ratings and retrieves accounts ordered by annual revenue. |
| AccountTrigger | Apex trigger | Sets a blank `Account.Industry` to `Other` before insert or update. |
| accountTopList | LWC | Displays a configurable list of accounts with the highest annual revenue. |

## How the components work together

- `accountTopList` calls `AccountService.getTopAccounts` through an `@AuraEnabled` wire service and renders returned Account names.
- `AccountTrigger` independently sets blank `Account.Industry` values to `Other` during Account insert and update operations.
- `AccountService.updateAccountRatings` queries and updates Account ratings based on `Account.AnnualRevenue`; no call to this method is present in the LWC or trigger source.

## Component details

### AccountService (Apex class)

- **Sharing:** `with sharing`
- **API version:** 62.0
- **Status:** Active
- **Methods:**
  - `public static void updateAccountRatings(Set<Id> accountIds)`: Queries `Account.Id`, `Account.AnnualRevenue`, and `Account.Rating`. Sets `Account.Rating` to `Hot` at annual revenue of 10,000,000 or more, `Warm` at 5,000,000 or more, and `Cold` otherwise, then updates the queried records.
  - `@AuraEnabled(cacheable=true) public static List<Account> getTopAccounts(Integer limitCount)`: Queries `Account.Id`, `Account.Name`, and `Account.AnnualRevenue`, orders by `AnnualRevenue` descending with nulls last, and applies `limitCount`.
  - `private static void logAccountUpdate(Account acc)`: Updates the supplied Account and writes its Id and Rating to `System.debug`. No call to this method appears in the source.

### AccountTrigger (Apex trigger)

- **Object:** `Account`
- **Events:** `before insert`, `before update`
- **Logic:** For each `Trigger.new` record, sets `Account.Industry` to `Other` when `String.isBlank(acc.Industry)` is true.
- **Handler:** None found.

### accountTopList (LWC)

- **Exposed targets:** `lightning__RecordPage`, `lightning__AppPage`, `lightning__HomePage`
- **API properties:** `recordLimit` (`Integer`, default `5`)
- **Apex wiring:** Imports `AccountService.getTopAccounts` and passes `recordLimit` as `limitCount`
- **Rendering:** Displays Account names in a list and displays `Unable to load accounts.` when the wire service returns an error.
- **Events:** None found.

## Dependencies

- **Objects and fields:** `Account.Id`, `Account.Name`, `Account.AnnualRevenue`, `Account.Rating`, `Account.Industry`
- **External callouts:** None
- **Other modules or unassigned components used:** `AccountService.getTopAccounts`

## Salesforce considerations

- Governor limits: No SOQL or DML inside loops found. `updateAccountRatings` performs one SOQL query and one DML update outside the loop; `getTopAccounts` performs one SOQL query.
- Bulkification: Partial. `updateAccountRatings` processes queried records in a loop and updates the list once; `AccountTrigger` processes `Trigger.new` as a collection.
- Security: `AccountService` uses `with sharing`. No explicit CRUD or FLS checks are present in `AccountService` or `AccountTrigger`.

## Tests

- Test classes: `AccountServiceTest`
- Coverage notes: The test creates Accounts with annual revenue of 5,000,000 and 10,000, but asserts `Hot` and `Warm`. Under the current `updateAccountRatings` thresholds, the 5,000,000 Account should be `Warm` and the 10,000 Account should be `Cold`.

## Removed components

None.

## Change history

- 2026-11-26 — Yaswanth Tikkisetti — Added new condition for rating and Status field value for cancelled updates
- 2026-11-26 — Yaswanth Tikkisetti — Added logAccount method to update account
- 2026-11-25 — yaswanthEPAM — Update AccountService to change revenue threshold

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
