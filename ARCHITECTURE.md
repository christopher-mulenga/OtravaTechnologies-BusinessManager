# Architecture

Otrava Technologies Business Manager is a client-side application with a clear separation of concerns.

```
View (routes + components)
  → Zustand store (application services)
    → Calculation / numbering / reporting modules
      → IndexedDB persistence
```

## Layers

- **Views** (`src/routes`, `src/components`) render the desktop-style shell, forms, and tables. They do not contain financial arithmetic or storage code.
- **Store** (`src/lib/otrava/store.ts`) is the service layer: customers, catalogue, quotations, invoices, payments, conversion, backup, and audit.
- **Core** (`src/lib/otrava/calculations.ts`, `numbering.ts`, `validation.ts`, `reports.ts`) holds reusable business rules.
- **Infrastructure** (`src/lib/otrava/db.ts`, `pdf.ts`, `csv.ts`) handles IndexedDB, PDF, print, and CSV.

## Why this stack

The original specification prefers C# / WPF / SQLite. This environment serves a live web application, so the product is implemented as a fully offline browser app with the same workflows, branding, and data rules. All resources are bundled. There are no cloud APIs, CDNs, or remote databases.

## Document integrity

- Line items store description, quantity, price, discount, and tax at save time (catalogue price changes do not rewrite history).
- Quotation-to-invoice conversion copies items, links the two documents, and marks the quotation Converted in one write batch.
- Issued/paid invoices are restricted; only drafts are freely deleted.
- Customers with documents are deactivated rather than permanently deleted.

## Themes

Appearance is a CSS token system (`src/styles.css`) with brand colours `#315B65` and `#1E3E45`. Light, dark, and system modes apply immediately and persist locally.
