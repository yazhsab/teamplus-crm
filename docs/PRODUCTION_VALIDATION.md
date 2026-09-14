# Production readiness evidence — 14 September 2026

The implemented CRM/operations MVP has a deployable Next.js + Supabase runtime. This is a code and local integration handover; no public production deployment, live customer migration, or production invitation campaign was performed.

## Verified

| Check | Result |
| --- | --- |
| TypeScript | Passed for the final shared and production source |
| PostgreSQL migration tests | 13 passing cases on PostgreSQL via PGlite, including all three migrations |
| Real Supabase migrations | All three applied successfully to local Supabase PostgreSQL 17 |
| Real Supabase integration | Passed using Auth, PostgREST, PostgreSQL, Storage and the standalone Next server |
| Standalone HTTP checks | Passed: login/static assets, security headers, private cache, redirect and authentication boundary, Origin checks, JSON size/type errors and invalid callback links |
| Production framework build | Next.js 16.3.5, React 19.2.8; standalone output generated successfully |
| Clean Linux Docker build | Passed on Node 22, installing from the checked-in lockfile |
| Container startup | Passed: unprivileged runtime, environment validation, health/login responses and protected API authentication |
| Production dependency audit | Zero known vulnerabilities from `npm audit --omit=dev` at validation time |
| Sites demo build | Passed with the retained preview adapter and upgraded preview framework |
| Existing local demo | Root and workspace API return 200; 12 existing sample jobs preserved |

The database tests cover empty production initialization; unauthenticated access; cross-tenant reads/writes; shared member access; viewer restrictions; direct table DML rejection; valid dates and monetary bounds; idempotent commands; stage sequencing; artwork invalidation on scope changes; scope locks; quality and delivery gates; payment role/balance checks; stale concurrent updates; payment ledger/activity consistency; task versions; private file policies; administrator-only account access; last-admin protection; membership revocation; and abandoned-upload finalization races.

The real integration suite signs in through the app and checks HttpOnly cookies, shared records, outsider denial, idempotent enquiry creation, oversized requests, payment authorization/replay/conflicts, signed uploads, downloaded byte equality and attachment disposition, member revocation, real recovery token redemption and password updates. It creates and cleans up disposable local accounts and data. Email delivery to a production SMTP service was not tested.

The Linux build exposed a cross-platform npm lockfile issue. The lockfile was repaired using a clean Node 22/npm 10 resolution and verified with `npm ci` inside Docker. The image `teamplus-crm:local` was built and its startup was exercised. The Docker check was for container startup and the unauthenticated boundary; the full Supabase suite used the standalone Node server on the host.

## Scope and rollout requirements

- Netlify is the selected app host. Its configuration and setup instructions are included; no Netlify account deployment was executed. See the Netlify packaging evidence below before go-live.
- A real Supabase project, production SMTP, domain/TLS, backups, monitoring and the first team administrator still need configuration according to DEPLOYMENT.md.
- The Vercel configuration is included; no Vercel account deployment was executed.
- Visual/browser automation, assistive-technology testing, load testing and an independent penetration test were not performed in this pass. Run staff acceptance tests and representative load tests in staging before rollout.
- The full dependency audit retains four **moderate development-only** findings in the existing Drizzle Kit/esbuild migration tooling used by the Sites demo. No high or critical findings remain. Those tools are not part of the traced production runtime. Do not expose development servers to untrusted networks; remove or update the preview migration toolchain when retiring the Sites demo.
- This release records whole INR amounts and basic job collections. GST invoices, double-entry accounting, refunds/credit notes, inventory/procurement, payroll, department/field-level financial permissions, end-user MFA, offline work and external messaging integrations remain outside the implemented MVP.
- Production reads currently return the complete job/task/file workspace with the latest 200 activity entries. Historical activity remains in PostgreSQL. Large-scale pagination/search and performance capacity must be established before expanding beyond a small team.

## Reproduce

```sh
npm ci --include=dev
npm run typecheck
npm test
npm run build:production
npm run test:http
npm audit --omit=dev --audit-level=high
npx supabase start
npm run test:integration
docker build -t teamplus-crm:local .
```

CI contains the same core checks, including actual local Supabase integration on an isolated Linux runner. Consult [GitHub Actions](https://github.com/yazhsab/teamplus-crm/actions) for the status of the specific commit being deployed; the local evidence above is separate from those hosted checks.

## Netlify packaging — 14 September 2026

Added `netlify.toml` with Node 22, an environment check, the `build:netlify` command and `.next-production` publish directory. The current Next.js adapter is explicitly selected without pinning its package version. Netlify output is excluded from Git, Docker contexts and TypeScript/ESLint source scans. The production runner accepts Turbopack for Netlify while preserving the standalone Webpack build.

- **Passed:** local Netlify packaging using CLI 27.6.0, Build 36.4.8, Next.js adapter 5.15.13, Next.js 16.3.5 and Node 22.23.2. The build produced the server function and Node middleware edge function. Placeholder environment values were used; no live project credentials were required.
- **Passed:** direct invocation of the generated server function from its deployment directory, with a synthetic middleware request and local-only Blobs configuration. The login page returned 200 and its script nonce matched the middleware request nonce; an untrusted-origin workspace write returned 403. This check did not contact a production database or a Netlify account.
- **Local simulator limitation:** `netlify serve --offline` did not pass the complete runtime checks. It produced mismatched CSP/script nonces, compressed-response errors and altered error responses, including after a clean artifact build. Running the packaged function from its deployment directory preserved the expected nonce and 403 response. This suggests a local simulation difference; it is not proof that the hosted deployment is correct.
- **Required on hosted staging:** nonce/script agreement, sign-in/session refresh, recovery, role restrictions, a job write, upload/download and the exact 403 response for untrusted-origin writes. Use configured Netlify environment scopes and the real Supabase Auth settings. Do not call the Netlify deployment production-verified until these pass.

The standalone HTTP regression check now asserts nonce agreement between the CSP header and rendered scripts. The database/schema and business workflows were not changed for Netlify.
