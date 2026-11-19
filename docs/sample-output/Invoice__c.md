# Invoice (`Invoice__c`)

> Auto-generated from `sample-sfdx-project/force-app/main/default/objects/Invoice__c/Invoice__c.object-meta.xml`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Type | Custom object |
| Record name | Invoice Number, AutoNumber, format `INV-{0000}` |
| Sharing model | Private |
| Last changed | Not available (no git history) |

## Purpose

Stores invoices. Each invoice has an amount and a status.

## Fields

| Label | API name | Type | Required | Notes |
|---|---|---|---|---|
| Amount | `Amount__c` | Currency (16,2) | Yes | |
| Status | `Status__c` | Picklist | No | Values: Draft (default), Sent, Paid |

## Relationships

None found in this project.

## Validation rules

None found in this project.

## Automation on this object

- Triggers: None
- Flows: None

## Change history

Not available (no git history in the sample project).

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->

