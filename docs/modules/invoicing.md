# Invoicing

> Auto-generated from the components of module `invoicing`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | invoicing |
| Components | 2 (1 custom object, 1 flow) |
| Last changed | 2026-11-26 by Yaswanth Tikkisetti |

## Purpose

Invoice__c stores invoice records and their amount and status. Invoice_Validate_Amount validates new or updated invoices before they are saved.

## Components

| Component | Type | Purpose |
|---|---|---|
| Invoice__c | Custom object | Stores invoice records with an amount and status. |
| Invoice_Validate_Amount | Flow | Blocks non-positive amounts and defaults blank status values to Draft. |

## How the components work together

Before an Invoice__c record is created or updated, Invoice_Validate_Amount evaluates Amount__c. A zero or negative value produces a field error on Amount__c. Otherwise, the flow checks Status__c and assigns Draft if the status is blank.

## Component details

### Invoice__c (Custom object)

- **Label:** Invoice
- **Plural label:** Invoices
- **Name field:** Invoice Number (`AutoNumber`, format `INV-{0000}`)
- **Deployment status:** Deployed
- **Sharing model:** Private
- **Key fields:**
  - `Amount__c`: Required Currency field with 16-digit precision and 2 decimal places.
  - `Status__c`: Optional Picklist field with `Draft` (default), `Sent`, `Paid`, and `Cancelled` values.
- **Relationships:** None found.
- **Validation rules:** Amount validation is implemented by Invoice_Validate_Amount. No validation rule metadata was found.

### Invoice_Validate_Amount (Flow)

- **API version:** 62.0
- **Trigger:** Record-before-save for creates and updates on `Invoice__c`.
- **Status:** Active
- **Check Amount:** Evaluates `$Record.Amount__c <= 0.0`. If true, adds the field error `Amount must be greater than zero.` to `Amount__c`.
- **Check Status:** If `$Record.Status__c` is blank, assigns `Draft` to `$Record.Status__c`.
- **Records read or written:** The flow reads and updates fields on the triggering `Invoice__c` record.

## Dependencies

- **Objects and fields:** `Invoice__c`, `Invoice__c.Amount__c`, `Invoice__c.Status__c`
- **External callouts:** None
- **Other modules or unassigned components used:** None

## Salesforce considerations

- Governor limits: No Apex SOQL or DML in loops found.
- Bulkification: Yes. The flow runs before save on each triggered `Invoice__c` record.
- Security: Sharing model for `Invoice__c` is Private. No Apex sharing keywords or Apex CRUD/FLS checks apply.

## Tests

- Test classes: None found
- Coverage notes: Not available

## Removed components

None.

## Change history

- 2026-11-26 — Yaswanth Tikkisetti — Added a new status option canclled field for Invoice Status and one more check for 5000000 for warm
- 2026-11-19 — Sai Krishna Gadiyakari — Add Salesforce documentation agent POC

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
