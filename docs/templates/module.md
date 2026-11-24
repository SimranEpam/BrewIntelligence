# {{ModuleTitle}}

> Auto-generated from the components of module `{{module_id}}`. Edit the "Manual notes" section only.

| Field | Value |
|---|---|
| Module | {{module_id}} |
| Components | {{total}} ({{counts per type, e.g. 2 Apex classes, 1 trigger}}) |
| Last changed | {{last_commit_date}} by {{last_commit_author}} |

## Purpose

{{One paragraph: what this module does and why it exists, based on its components.}}

## Components

| Component | Type | Purpose |
|---|---|---|
| {{name}} | {{Apex class / Apex trigger / LWC / Custom object / Flow}} | {{short purpose}} |

## How the components work together

{{Short walkthrough, in order, of how the components call or depend on each other
(for example trigger -> handler class -> LWC).}}

## Component details

{{One subsection per component, using the type-specific fields below. Omit fields that do not apply.}}

### {{name}} ({{type}})

- **Apex class:** sharing keyword, API version, public interface (method, signature, purpose), entry points (`@AuraEnabled`, `@InvocableMethod`, REST).
- **Apex trigger:** object, events, handler or logic called.
- **LWC:** exposed targets, `@api` properties, wired data and Apex methods used, events fired.
- **Custom object:** key fields (API name, type, purpose), relationships, validation rules.
- **Flow:** trigger or entry point, decisions, records read or written.

## Dependencies

- **Objects and fields:** {{Object.Field list}}
- **External callouts:** {{Named credentials or endpoints, or "None"}}
- **Other modules or unassigned components used:** {{list or "None"}}

## Salesforce considerations

- Governor limits: {{SOQL/DML in loops, callouts, or "None found"}}
- Bulkification: {{Yes / No / Partial, with reason}}
- Security: {{CRUD/FLS checks, sharing enforcement}}

## Tests

- Test classes: {{ClassName list or "None found"}}
- Coverage notes: {{text or "Not available"}}

## Removed components

{{Components removed in this change, or "None". Do not list components that still exist.}}

## Change history

{{Last 3 commits touching the changed components: date, author, message}}

## Manual notes

<!-- Preserved across regenerations. Do not delete this heading. -->
