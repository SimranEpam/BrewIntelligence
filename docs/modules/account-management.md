# Account Management

> Auto-generated from the components of module `account-management`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | account-management |
| Components | 3 (1 Apex class, 1 Apex trigger, 1 LWC) |
| Last changed | 2026-11-26 by Yaswanth Tikkisetti |

## Purpose

This module applies Account rating and industry logic and displays a configurable list of top accounts ranked by annual revenue.

## Components

| Component | Type | Purpose |
|---|---|---|
| AccountService | Apex class | Updates Account ratings and queries top accounts by annual revenue |
| AccountTrigger | Apex trigger | Sets a default Industry value on Account records |
| accountTopList | LWC | Displays Account names in a revenue-ranked list |

## How the components work together

`accountTopList` calls `AccountService.getTopAccounts` and renders the returned Accounts. `AccountTrigger` runs separately on Account inserts and updates to set `Industry` to `Other` when it is blank. `AccountService.updateAccountRatings` queries Accounts and updates their `Rating` values.

## Component details

### AccountService (Apex class)

- **Sharing keyword:** `with sharing`
- **API version:** `62.0`
- **Status:** `Active`
- **Public interface:**
  - `public static void updateAccountRatings(Set<Id> accountIds)`
  - `@AuraEnabled(cacheable=true) public static List<Account> getTopAccounts(Integer limitCount)`
- **Behavior:** `updateAccountRatings` queries `Account.Id`, `AnnualRevenue`, and `Rating` for the supplied IDs. It sets `Rating` to `Hot` when `AnnualRevenue` is at least `10000000`; otherwise, it sets `Rating` to `Warm`. It then updates the queried Accounts.
- **Apex entry point:** `getTopAccounts` is available to Lightning components.
- **Private method:** `logAccountUpdate(Account acc)` updates the supplied Account and writes its Id and Rating to `System.debug`.

### AccountTrigger (Apex trigger)

- **Object:** `Account`
- **Events:** Before insert and before update
- **Logic:** Iterates through `Trigger.new`. When `Industry` is blank according to `String.isBlank`, it sets `Industry` to `Other`.

### accountTopList (LWC)

- **API version:** `62.0`
- **Exposed:** `true`
- **Targets:** `lightning__RecordPage`, `lightning__AppPage`, `lightning__HomePage`
- **`@api` property:** `recordLimit`, an `Integer` property with a default of `5`
- **Apex wire:** Calls `AccountService.getTopAccounts` with `limitCount` set to `$recordLimit`
- **Rendered behavior:** Displays Account `Name` values in a card titled `Top Accounts by Revenue`. Shows `Unable to load accounts.` when the wire call returns an error.
- **Events fired:** None found

## Dependencies

- **Objects and fields:** `Account.Id`, `Account.Name`, `Account.AnnualRevenue`, `Account.Rating`, `Account.Industry`
- **External callouts:** None
- **Other modules or unassigned components used:** `AccountService.getTopAccounts` is used by `accountTopList`

## Salesforce considerations

- **Governor limits:** No SOQL or DML statements are inside loops.
- **Bulkification:** Partial. `updateAccountRatings` performs one SOQL query and one DML update for the queried Accounts. `AccountTrigger` processes `Trigger.new` in a loop and does not perform DML inside the loop.
- **Security:** `AccountService` uses `with sharing`. No explicit CRUD or FLS checks are present in `AccountService` or `AccountTrigger`.

## Tests

- **Test classes:** `AccountServiceTest`
- **Coverage notes:** `testUpdateAccountRatings` creates Accounts with `AnnualRevenue` values of `5000000` and `10000`, then expects `Rating` values of `Hot` and `Warm`. The test expectation for the `5000000` Account conflicts with the `10000000` threshold in `updateAccountRatings`; the test may fail. Other coverage information is not available.

## Removed components

None.

## Change history

- 2026-11-26 — Yaswanth Tikkisetti — Test Account Service Updates with logAccount method
- 2026-11-25 — yaswanthEPAM — Update AccountService to change revenue threshold
- 2026-11-19 — Sai Krishna Gadiyakari — Add Salesforce documentation agent POC

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
