# Database

The application uses **IndexedDB** (database name `otrava-technologies`) as the local store.

## Object stores

| Store | Key | Contents |
| --- | --- | --- |
| company | `current` | Company profile and branding |
| app | `current` | Theme, backup, paper, setup flag |
| customers | `id` | Customer records |
| items | `id` | Products and services |
| quotations | `id` | Quotations and snapshot line items |
| invoices | `id` | Invoices and snapshot line items |
| payments | `id` | Payment records against invoices |
| sequences | `id` | Document and master-data numbering |
| audit | `id` | Activity log |
| backups | `id` | Local backup packages |

## Numbering

- Quotations: `{prefix}-{year}-{0001}` e.g. `QT-2026-0001`
- Invoices: `{prefix}-{year}-{0001}` e.g. `INV-2026-0001`
- Customers: `CUS-0001`
- Catalogue: `ITM-0001` (or a user-supplied code)

Sequences are incremented when a number is first assigned and persisted with the document write.

## Backup package

A backup is a JSON document (`version: 1`) containing company, settings, customers, catalogue, quotations, invoices, payments, sequences, and audit entries. Restore validates the file, writes a safety copy, then replaces the active database.
