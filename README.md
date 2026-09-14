# TeamPlus CRM & Operations

A working first version for reviewing TeamPlus's customer-to-fulfilment journey. Includes illustrative data; it is not yet a production CRM/ERP or accounting system.

See [the product blueprint](docs/TEAMPLUS_PRODUCT_BLUEPRINT.md) for the provider review, product specification, stack recommendation, production gaps and phased plan.

## Implemented

Customer summaries, enquiry creation/editing, sales pipeline, job stages, recorded artwork approval, QC gates, delivery confirmation, collections, notes/timeline, tasks, authenticated attachments, estimated-margin reports and CSV export. All core changes use server-side persistence and identity scope.

## Runtime

React + TypeScript, Sites-compatible Vinext, Cloudflare Workers, D1, R2, Drizzle migrations and Shadcn/Radix primitives. The current starter uses a beta Vinext release. For the quickest affordable production path, the blueprint now recommends React + Supabase (PostgreSQL, Auth, Storage and small server functions). Supabase is not yet connected; this review build still uses D1/R2.

## Local development

```sh
npm run install:ci
npm run dev
```

Use the URL printed by the server. The local sign-in endpoint establishes a development-only cookie. Do not use development mock identity in production.

## Build and database

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tired_nighthawk.sql
```

Apply the migration once per new local database. Sites handles hosted migrations. Schema changes use `npm run db:generate`. Keep applied migrations immutable.

## API checks

```sh
npm start -- --port 4174
python3 tests/api-smoke.py
```

Tests only target `127.0.0.1:4174`, the built local Worker, and create a disposable synthetic test identity. They exercise authorization, origin protection, validation, stale-write rejection, every workflow gate, payment bounds, task completion and durable readback. They are not browser tests.

## Key boundaries

- Private owner workspace; no shared staff RBAC yet.
- Project estimates only; formal itemized quotations and statutory finance are pending.
- No WhatsApp/email sending, stock ledger, purchasing or scheduling integrations.
- Files are private and limited to 10 MB. No in-browser preview or scanning yet.
- Sample customers are fictional, not imported company records.
- The production domain requires normalized tables, organization membership and independently versioned business documents.

## Publishing

Logical bindings and project identity are in `.openai/hosting.json`. Use Sites building/hosting skills to build, push the exact source, package and privately deploy. Never commit credentials, local database state or uploaded files.
