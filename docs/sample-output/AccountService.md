# AccountService

> Auto-generated from `sample-sfdx-project/force-app/main/default/classes/AccountService.cls`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Apex class (service) |
| API version | 62.0 |
| Sharing | with sharing |
| Last changed | Not available (no git history) |

## Purpose

Updates the rating of accounts based on annual revenue, and returns the highest-revenue accounts for use in a Lightning component.

## Public interface

| Method | Signature | Purpose |
|---|---|---|
| updateAccountRatings | `void updateAccountRatings(Set<Id> accountIds)` | Sets Rating to "Hot" when AnnualRevenue is at least 1,000,000, otherwise "Warm", then updates the accounts. |
| getTopAccounts | `List<Account> getTopAccounts(Integer limitCount)` | Returns accounts ordered by AnnualRevenue descending, limited to `limitCount`. `@AuraEnabled(cacheable=true)`. |

## Entry points

- `@AuraEnabled(cacheable=true)` method: `getTopAccounts`
- Called programmatically: `updateAccountRatings` (no trigger or Flow caller found in this project)

## Dependencies

- **Objects and fields:** Account.Id, Account.Name, Account.AnnualRevenue, Account.Rating
- **Apex classes:** None
- **External callouts:** None

## Key logic

1. `updateAccountRatings` queries the accounts in the given set.
2. For each account, Rating is set to "Hot" if AnnualRevenue is non-null and at least 1,000,000; otherwise "Warm". Null revenue is set to "Warm".
3. All accounts are updated in a single DML statement.
4. `getTopAccounts` runs one query ordered by AnnualRevenue descending (nulls last) with a row limit.

## Salesforce considerations

- Governor limits: No SOQL or DML inside loops. Both queries and the update are outside the loop.
- Bulkification: Yes. Works on collections.
- Security: `with sharing` is declared. No explicit CRUD or FLS checks in either method. `getTopAccounts` returns Name and AnnualRevenue to the caller, so FLS should be enforced (for example with `WITH SECURITY_ENFORCED` or `Security.stripInaccessible`).

## Tests

- Test class: `AccountServiceTest`
- Coverage notes: `updateAccountRatings` is tested for both branches (Hot and Warm). `getTopAccounts` has no test in this project.

## Change history

Not available (no git history in the sample project).

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

