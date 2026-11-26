# Account Management

> Auto-generated from the components of module `account-management`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | account-management |
| Components | 3 (1 Apex class, 1 Apex trigger, 1 LWC) |
| Last changed | 2026-11-25 by yaswanthEPAM |

## Purpose

This module reads and updates Account records. `AccountService` supplies rating updates and top-Account queries, `AccountTrigger` assigns a default Industry value, and `accountTopList` displays Accounts with the highest Annual Revenue.

## Components

| Component | Type | Purpose |
|---|---|---|
| AccountService | Apex class | Updates Account ratings and retrieves top Accounts by Annual Revenue |
| AccountTrigger | Apex trigger | Sets a default Industry value for Account records |
| accountTopList | LWC | Displays top Accounts by Annual Revenue |

## How the components work together

- `accountTopList` calls `AccountService.getTopAccounts` and renders the returned Account Names.
- `AccountService.getTopAccounts` queries Account records ordered by Annual Revenue.
- `AccountTrigger` runs before Account insert and update operations and sets Industry to `Other` when it is blank.
- `AccountService.updateAccountRatings` updates Rating independently of the trigger.

## Component details

### AccountService (Apex class)

- **Sharing:** `public with sharing class`
- **API version:** 62.0
- **Public interface:**
  - `updateAccountRatings(Set<Id> accountIds)`: queries matching Accounts and sets Rating to `Hot` when AnnualRevenue is at least 10000000; otherwise sets it to `Warm`.
  - `getTopAccounts(Integer limitCount)`: queries Accounts ordered by Annual Revenue descending with null values last.
- **Entry point:** `getTopAccounts` is `@AuraEnabled(cacheable=true)`.

### AccountTrigger (Apex trigger)

- Runs on `Account` for `before insert` and `before update`.
- Iterates over `Trigger.new`.
- Sets Industry to `Other` when `String.isBlank(acc.Industry)` is true.

### accountTopList (LWC)

- Exposed on Record, App, and Home pages.
- `@api recordLimit` defaults to `5`; it is configurable on Home pages.
- Calls `@salesforce/apex/AccountService.getTopAccounts` through `@wire`.
- Renders Account Names and a local error message when loading fails.
- Fires no custom events.

## Dependencies

- **Objects and fields:** `Account.Id`, `Account.Name`, `Account.AnnualRevenue`, `Account.Rating`, `Account.Industry`
- **External callouts:** None
- **Other modules or unassigned components used:** None found

## Salesforce considerations

- Governor limits: No SOQL or DML statements occur inside loops.
- Bulkification: Yes. `updateAccountRatings` processes queried Accounts in a loop and performs one bulk update.
- Security: `AccountService` uses `with sharing`. The source contains no explicit CRUD or FLS checks for its SOQL or DML operations.
- `AccountServiceTest.testUpdateAccountRatings` creates an Account with AnnualRevenue 5000000 and expects Rating `Hot`, while `updateAccountRatings` assigns `Hot` only when AnnualRevenue is at least 10000000. This test expectation conflicts with the implementation.

## Tests

- Test classes: `AccountServiceTest`
- Coverage notes: The test covers `testUpdateAccountRatings`; a percentage is Not available.

## Removed components

None.

## Change history

- 2026-11-25, yaswanthEPAM: Update AccountService to change revenue threshold
- 2026-11-19, Sai Krishna Gadiyakari: Add Salesforce documentation agent POC

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
