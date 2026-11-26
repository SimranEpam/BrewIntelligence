# Invoicing

> Auto-generated from the components of module `invoicing`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | invoicing |
| Components | 2 (1 custom object, 1 flow) |
| Last changed | 2026-11-26 by Yaswanth Tikkisetti |

## Purpose

This module defines the `Invoice__c` custom object and a before-save flow that validates invoice amounts and initializes blank statuses.

## Components

| Component | Type | Purpose |
|---|---|---|
| `Invoice__c` | Custom object | Stores invoice number, amount, and status. |
| `Invoice_Validate_Amount` | Flow | Validates `Amount__c` and defaulting for `Status__c` before Invoice__c records are saved. |

## How the components work together

`Invoice_Validate_Amount` runs before create or update saves on `Invoice__c`. It checks `Amount__c` first, blocking the save when the value is less than or equal to `0.0`. When the amount is valid, it checks `Status__c`; a blank status is set to `Draft`.

## Component details

### `Invoice__c` (Custom object)

- Label: Invoice
- Plural label: Invoices
- Name field: `Invoice Number`, AutoNumber, display format `INV-{0000}`
- Deployment status: Deployed
- Sharing model: Private
- Key fields:
  - `Amount__c`: Currency; 16 digits of precision; 2 decimal places; required.
  - `Status__c`: Picklist; optional; default and values: `Draft`, `Sent`, `Paid`, `Cancelled`.
- Relationships: Not found
- Validation rules: Not found

### `Invoice_Validate_Amount` (Flow)

- API version: 62.0
- Process type: `AutoLaunchedFlow`
- Trigger: Before save for `Invoice__c` on create and update
- Status: Active
- Records read: `$Record.Amount__c` and `$Record.Status__c`
- Records written: Sets `$Record.Status__c` to `Draft` when it is blank
- Decisions:
  - `Check_Amount`: When `Amount__c` is less than or equal to `0.0`, the flow returns field error `Amount must be greater than zero.` on `Amount__c`. Otherwise, it continues to `Check_Status`.
  - `Check_Status`: When `Status__c` is blank, the flow runs `Set_Default_Status`.

## Dependencies

- **Objects and fields:** `Invoice__c`, `Invoice__c.Amount__c`, `Invoice__c.Status__c`
- **External callouts:** None
- **Other modules or unassigned components used:** None

## Salesforce considerations

- Governor limits: No Apex SOQL or DML code found.
- Bulkification: Not applicable to Apex; no Apex classes or triggers are present.
- Security: No Apex sharing, CRUD, or FLS checks are present. The `Invoice__c` object sharing model is `Private`.

## Tests

- Test classes: None found
- Coverage notes: Not available

## Removed components

None.

## Change history

- 2026-11-26 — Yaswanth Tikkisetti — Added new condition for rating and Status field value for cancelled updates
- 2026-11-19 — Sai Krishna Gadiyakari — Add Salesforce documentation agent POC

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
