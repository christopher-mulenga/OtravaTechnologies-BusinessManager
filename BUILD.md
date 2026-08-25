# Build

## Prerequisites

- Node.js 22+
- npm

## Commands

```bash
npm install
npm run dev          # development server
npm run typecheck    # TypeScript
npm run build        # production build
```

Calculation tests:

```bash
node --experimental-strip-types --test src/lib/otrava/calculations.test.ts
```

## Offline PDF

PDF export uses `jspdf`, bundled with the application. Printing uses a local HTML document and the system print dialog. Neither requires a network connection once the app is loaded.
