# Otrava Technologies Business Manager

Offline-first business management for Otrava Technologies: customers, products and services, quotations, invoices, payments, reports, PDF/print, and backup/restore.

The live application stores all data locally in the browser (IndexedDB). No internet connection is required after the app has loaded.

## What you can do

- Manage customers and a product/service catalogue
- Create quotations and invoices with live tax and discount totals (ZMW by default)
- Convert a quotation into an invoice in one step
- Record partial and full payments until an invoice is marked Paid
- Export professional PDFs and print documents
- Search history, run sales reports, and back up or restore the full database
- Switch light/dark/system appearance without restarting

## Default company profile

The app ships as **Otrava Technologies** (Lusaka, Zambia, currency ZMW). Change every company field under **Settings**.

## Data location

All records stay on this device:

- Database: browser IndexedDB (`otrava-technologies`)
- Backups: downloadable JSON files, plus a rolling local backup history

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd + F or K | Search |
| Ctrl/Cmd + B | Backup |
| Esc | Close dialogs |

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
node --experimental-strip-types --test src/lib/otrava/calculations.test.ts
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [BUILD.md](BUILD.md), [INSTALLATION.md](INSTALLATION.md), and [USER_GUIDE.md](USER_GUIDE.md).
