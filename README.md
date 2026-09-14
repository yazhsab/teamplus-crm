# TeamPlus CRM & Operations

A deployable CRM and job-operations MVP for TeamPlus: enquiries, customers, sales pipeline, artwork approval, production, quality checks, delivery, collections, tasks and job files.

Private GitHub repository: [yazhsab/teamplus-crm](https://github.com/yazhsab/teamplus-crm). Use the **yazhsab** account when connecting this repository to Netlify. The app is at the repository root, so leave Netlify's base directory empty.

The code supports two explicit runtimes using the same React UI:

| Runtime | Command | Address | Identity / storage |
| --- | --- | --- | --- |
| Production development | `npm run dev:production` | http://localhost:3000 | Supabase Auth, PostgreSQL, private Storage |
| Production release | `npm run build:production` then `npm run start:production` | http://localhost:3000 | Supabase; requires configured environment |
| Existing Sites demo | `npm run dev` | http://localhost:5173 | Local demo sign-in, D1 and R2 sample data |

Production never trusts Sites identity headers or the local demo cookie. It starts empty and requires an assigned team account. Demo data is not copied into production.

## Production setup

Use Node.js 22 and npm. Install with `npm ci --include=dev`. Copy `.env.example` to `.env.local`, configure a Supabase project, apply `supabase/migrations`, and provision the first administrator.

Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete Supabase, Netlify, Docker, Vercel, invitation, backup, and rollback instructions. Runtime environment needs only `APP_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `TEAMPLUS_ORGANIZATION_ID`. The app does not need a service key.

```sh
npm run check:env
npm run build:production
npm run start:production
```

Netlify (selected host): connect the repository containing this app and use the directory containing `package.json` as the base. `netlify.toml` selects Node 22, validates the environment, runs `build:netlify` with Turbopack and publishes `.next-production` through Netlify's current Next.js adapter. Set the four environment variables for Builds and Functions before deploying. Follow the [Netlify setup](docs/DEPLOYMENT.md#netlify-selected-host); dragging the Sites `dist` folder into Netlify will not deploy this production app.

Docker: `docker compose up --build -d`. Vercel: select this `crm` directory as the project root; `vercel.json` supplies the build configuration. Configure HTTPS and the four environment variables before use.

## Validation

```sh
npm run typecheck
npm test
npm run build:production
npm run test:http
npm audit --omit=dev --audit-level=high
```

For integration with actual local Supabase services, start Docker Desktop, then:

```sh
npx supabase start
npm run test:integration
```

The integration suite refuses remote Supabase URLs and cleans up its own test records and users. It tests the production server, real cookie sessions, tenant isolation, payments, uploads/downloads, member revocation and password recovery. CI runs these checks on Linux. See [PRODUCTION_VALIDATION.md](docs/PRODUCTION_VALIDATION.md) for the actual run results and remaining rollout checks.

## Roles and scope

- **Admin:** operations, payments and team permissions.
- **Manager:** operations and payments.
- **Member:** operations, tasks and files; cannot record payments or change team permissions.
- **Viewer:** reads and exports only.

All four roles can view the team's financial values. These are team-wide roles, not department-level or field-level access controls. An operator sends invitations through `npm run team:admin -- invite EMAIL ROLE`; administrators change existing access under Connections.

Job changes and activity entries commit together. Payments also create an immutable ledger entry. Every command uses an idempotency key; jobs and tasks use versions to reject conflicting writes. Artwork, QC and delivery evidence are enforced in PostgreSQL. File uploads go directly to signed Storage URLs so app-host request-size limits do not block the 10 MB allowance.

This release is a CRM and operations MVP. It does not implement statutory GST invoicing, double-entry accounting, refunds/credit notes, procurement, inventory, payroll, partial fulfilment, WhatsApp/email integrations or offline synchronization. The quotation printout is a scope/value summary, not a tax invoice. Amounts are currently whole INR. Build those modules before using TeamPlus as the authoritative system for those functions.

## Structure

- `app`, `components`: Next routes and shared workspace UI.
- `lib/server`, `lib/supabase`: production authentication, HTTP handling, Supabase API.
- `supabase/migrations`: versioned PostgreSQL schema, grants, RLS, workflow functions and storage policies.
- `lib/preview`, `db`, `drizzle`: existing Sites demo adapter and local data.
- `scripts`: release runner, environment checks and operator utilities.
- `tests/production`: PostgreSQL, standalone HTTP and real Supabase integration suites.

Standard Next builds resolve `lib/runtime.ts` to Supabase. Only the Sites Vite configuration aliases it to the preview adapter. Production output uses `.next-production`; demo build output uses `dist` and `.next` tooling state.

The original provider review and rollout plan are in [TEAMPLUS_PRODUCT_BLUEPRINT.md](docs/TEAMPLUS_PRODUCT_BLUEPRINT.md).
