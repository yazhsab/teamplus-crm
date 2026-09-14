# Deploying TeamPlus

This runbook deploys the implemented CRM/operations MVP with Next.js and Supabase. It does not deploy the Sites demo as a production ERP.

## 1. Supabase project

Create a dedicated Supabase project for production and another for staging. Choose an appropriate region near your users and use a paid production plan with suitable backups. Do not put real customer records into the demonstration workspace.

Use Node 22 and the pinned npm lockfile:

```sh
npm ci --include=dev
cp .env.example .env.local
```

Configure these four values. `.env.local` stays out of Git, Docker build contexts and releases.

| Variable | Value |
| --- | --- |
| `APP_URL` | Exact app origin, e.g. `https://crm.your-domain.example`; no path, query or wildcard |
| `SUPABASE_URL` | Project API URL from Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key or legacy **anon** key; never a secret/service role key |
| `TEAMPLUS_ORGANIZATION_ID` | New UUID for this deployment's team; generate once with `uuidgen` |

The application uses the user's verified session for data access. A privileged service key is not needed in the application or hosting environment. CSP permits direct file uploads to the configured Supabase origin. HTTP is accepted only for loopback development URLs.

Authenticate the Supabase CLI and apply reviewed migrations:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`db push` applies all files under `supabase/migrations` in order. Do not edit applied migrations. Do not use `db reset` on a linked production database. The schema includes the private `teamplus-files` bucket; create it through the migration, not manually. Keep `auth`, `storage`, and `teamplus_private` out of the Data API's exposed schemas. The app exposes its tables/functions in `public` with explicit grants and RLS.

### Authentication settings

In the Supabase dashboard:

1. Enable the **Email** provider. Disable **Allow new users to sign up** globally. Keep anonymous sign-ins disabled.
2. Set Site URL to exactly `APP_URL`. Allow `APP_URL/auth/confirm` as a redirect URL. Avoid wildcard production redirects.
3. Set minimum password length to 12 or more. Enable email confirmation and secure password change.
4. Configure a production SMTP provider and verify its sender domain. Configure provider and auth rate limits for your team's expected login and recovery traffic.
5. Replace the Invitation and Reset Password email bodies with `supabase/templates/invite.html` and `supabase/templates/recovery.html`. These use `TokenHash`, not the implicit-flow confirmation URL. Without these templates, invitation/recovery links will not follow this app's session flow.
6. Apply password policy and breach detection supported by your plan. Protect Supabase and hosting administrator accounts with MFA.

The app itself currently provides password authentication and recovery; it does not implement an end-user MFA enrollment/challenge UI. Do not enforce AAL2 for app users until that flow is implemented and tested.

The checked-in `supabase/config.toml` applies to local Supabase. It does **not** automatically configure a hosted project's SMTP/auth dashboard settings. In local config, `[auth.email].enable_signup=true` enables the email provider, while global `[auth].enable_signup=false` blocks self-registration. Do not disable the provider when disabling public signup.

### First administrator and invitations

Create the first confirmed user in Supabase Authentication → Users. Copy its user UUID. In a trusted operator shell, set `SUPABASE_SERVICE_ROLE_KEY` using your secret manager; do not put it in the app's `.env.local` or hosting environment. Both legacy service-role and new Supabase secret keys work for the operator client.

```sh
npm run team:admin -- bootstrap AUTH_USER_UUID "TeamPlus"
```

Bootstrap atomically creates the organization and first administrator and is safe to repeat with the same IDs. Then sign in normally. To invite another team member (this command sends an email):

```sh
npm run team:admin -- invite colleague@example.com member
```

Roles: `admin`, `manager`, `member`, `viewer`. Existing roles and removals are managed in Connections by an administrator. The last administrator cannot be removed. Existing Supabase accounts cannot be invited again through this utility; use the dashboard to assign their membership in the chosen organization. Audit that operator change. Remove the privileged key from your shell after provisioning.

## 2. Deploy the app

### Netlify (selected host)

Complete the Supabase setup above, including migrations, the first administrator and email templates. Netlify hosts the Next.js application and server routes; Supabase remains responsible for authentication, PostgreSQL and private files.

1. Push the app source to your Git provider and choose **Add new project → Import an existing project** in Netlify. Select that repository. This checkout's Git root is `crm`, so leave the base directory empty if you push it directly. If the repository instead contains a parent directory with `crm/package.json`, set the base to `crm`.
2. Name the Netlify project to establish its HTTPS address. Set `APP_URL` to that exact origin, for example `https://YOUR_SITE.netlify.app`, or your configured custom domain. The example address is a placeholder, not an existing deployment.
3. In Netlify's environment settings, add `APP_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `TEAMPLUS_ORGANIZATION_ID`. Make them available to **Builds and Functions** (or all scopes), with production values limited to the production deploy context. Do not add a service-role/secret key. Environment variables in `netlify.toml` alone are not a substitute for runtime configuration in the dashboard.
4. Confirm the settings below, supplied by `netlify.toml`. The configuration explicitly selects Netlify's current Next.js adapter so CLI builds also select the production framework in this repository with a separate Vite preview. No pinned adapter dependency or custom functions directory is required.
5. Set Supabase's Site URL to `APP_URL` and allow the exact `APP_URL/auth/confirm` redirect. When switching to a custom domain, update both Netlify's `APP_URL` and Supabase's URL settings, then redeploy before inviting users.
6. Deploy through the Git integration. Check `/api/health`, sign-in, recovery, a job update and a file upload/download on the deployed origin. Health checks validate configuration, not live database or email availability.

| Setting | Value |
| --- | --- |
| Node.js | `22` |
| Build command | `npm run check:env && npm run build:netlify` |
| Publish directory | `.next-production` (relative to the app base) |
| Build target | `TEAMPLUS_BUILD_TARGET=production` |
| Runtime | Netlify's automatic Next.js adapter / server functions |

`build:netlify` uses Next.js's Turbopack build. The existing `build:production` command retains Webpack for the standalone Docker/VPS release. Both use the production Supabase runtime and `.next-production` output; neither builds the Sites preview.

Use a Git-backed build, not Netlify Drop or a static export. Do not set the publish directory to `dist`, `public` or `.next-production/standalone`, and do not add a `/* /index.html 200` rewrite. The Next.js adapter owns routing and function packaging. The checked-in build command deliberately fails if the four app variables are missing instead of publishing an unusable sign-in screen. Do not add Supabase migration or administrator bootstrap commands to the Netlify build.

Deploy Previews and branch deploys need their own staging Supabase project, organization and exact `APP_URL`, with matching Auth URL settings. Disable those builds until staging is configured; do not give arbitrary preview code production credentials. The app's Origin checks intentionally reject writes from a hostname different from `APP_URL`.

App files are stored in Supabase, so the server functions need no persistent disk. Upload bytes go directly to signed Supabase Storage URLs; the 10 MB file allowance is not sent through Netlify Functions. Keep authenticated routes uncached and do not introduce a CDN rule that overrides the app's `private, no-store` responses.

For a local packaging check after configuring the environment:

```sh
npx netlify-cli build --offline
```

This prepares local Netlify artifacts; it does not publish. The local `netlify serve` simulation in CLI 27.6.0 produced middleware nonce and response-encoding inconsistencies during this handover. The packaged server function passed nonce propagation and cross-origin rejection checks when invoked from its deployment directory, but this does not establish a passing hosted deployment. Verify that the deployed login page's CSP nonce matches its scripts, then test real sign-in, recovery, writes and file transfers. Function environment scope, domain redirects and email delivery also require verification on the actual Netlify deployment. See [PRODUCTION_VALIDATION.md](PRODUCTION_VALIDATION.md) for the checks performed here.

Netlify's current Free plan permits commercial projects and includes 300 monthly credits on credit-based accounts; production deploys and traffic consume the allowance. A project can be paused when credits run out. Review usage during the pilot and select a paid plan for continuity if needed. Supabase billing is separate. See [Netlify pricing](https://www.netlify.com/pricing/) and [paused projects](https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/).

### Docker or a small VPS

```sh
npm run check:env
npm run typecheck
npm test
npm run build:production
npm run test:http
npm audit --omit=dev --audit-level=high

docker compose up --build -d
```

The multi-stage image runs as an unprivileged user and includes only the standalone traced release. No credentials are used during the image build. Compose binds to `127.0.0.1:3000`; terminate HTTPS using your platform's ingress or a reverse proxy and forward requests to that address. Preserve `Origin` and the real request path. Do not cache pages, API responses or responses containing `Set-Cookie`. Set request timeouts and host/WAF rate limits; app API JSON is bounded at 50 KB and authentication bodies at 4 KB. Upload bytes go directly to Supabase.

Set the four environment variables through the platform's secret/configuration manager. Container health checks call `/api/health`, which checks process responsiveness and valid configuration; it is **not** a database or SMTP readiness probe. Use authenticated synthetic workspace checks for end-to-end availability. Persist data in Supabase; the app container needs no data volume.

When testing against Supabase running locally in Docker, run the Next server on the host using `dev:production` or `start:production`; the Compose deployment expects a reachable HTTPS Supabase endpoint. A container’s loopback address does not refer to the host.

For a Node host without Docker:

```sh
npm run build:production
npm run start:production
```

The production runner validates configuration before startup. Build output is `.next-production/standalone`, with static assets copied into its `.next-production/static` directory and `public` included. Use a process manager or platform service with restart policies. The default is localhost port 3000; configure `HOSTNAME=0.0.0.0` only behind your intended ingress and set `PORT` as needed.

### Vercel

Use `crm` as the project root. `vercel.json` supplies `npm ci --include=dev`, `npm run build:production`, the `.next-production` output directory, and the production build target. Select Node 22 and set the four environment variables for each environment. Set `APP_URL` to the exact deployed origin. Use a distinct staging domain and staging Supabase project. Complete domain/TLS setup before sending team invitations.

The 10 MB file allowance does not require multipart uploads through Vercel: metadata goes through the app and file bytes go to signed Supabase Storage URLs. No Vercel account deployment is performed by checking in this configuration.

## 3. Local production testing

The existing demonstration remains available through `npm run dev` on port 5173.

For the real production stack locally, start Docker Desktop and run:

```sh
npx supabase start
npx supabase status
```

Use its local API URL and publishable key in `.env.local`, a new organization UUID, and `APP_URL=http://localhost:3000`. Create the first account in local Studio, then run bootstrap with the local operator key. Start `npm run dev:production`, or build and run the release. Local invitation/reset emails are visible in the local mail viewer reported by `supabase status`.

`npm run test:integration` uses real local Supabase and the built standalone app on port 4318. It creates disposable accounts/records, validates workflows and storage bytes, and removes its test data. It refuses remote Supabase URLs. `npm run test:http` uses a separate server on port 4317 to check the unauthenticated boundary. Do not run multiple copies of either test concurrently.

Stop local Supabase with `npx supabase stop` when no longer needed. This preserves its development volumes. Do not use `--no-backup` against development data you want to keep; CI uses it only for disposable runners.

## 4. Operating the MVP

- Monitor server errors (structured operation and correlation ID, without customer payloads), uptime, Supabase DB/storage usage and auth failures. API errors do not expose raw provider diagnostics.
- Configure Supabase managed backups with retention and recovery objectives appropriate to TeamPlus. Test restoration into a separate project. Database backups **do not back up Storage object bytes**; maintain a separate private object backup and verify downloaded checksums. Restore Auth/memberships, application tables, bucket policies and object bytes together. A CSV export is not a full backup.
- Keep the payment ledger and activity append-only. There is no refund/reversal UI in this MVP. Resolve financial corrections through an approved, audited maintenance procedure until a reversal workflow is implemented; do not use it as a statutory accounting ledger.
- Failed uploads stay private. `npm run storage:cleanup` shows incomplete uploads older than 24 hours. An operator with the service key may run `npm run storage:cleanup -- --apply`; it claims records transactionally before deleting objects and metadata, up to 100 per run. Completed files are excluded.
- Writes are limited to 120 commands per user/team/minute in PostgreSQL. Supabase Auth limits and host-level limits cover login/unauthenticated traffic. Application commands serialize briefly per team to keep payments and access changes consistent.
- Revoked members immediately lose access through the app and RLS. A download URL already issued remains usable until its 60-second expiry; Supabase signed upload authorizations have their own short-lived token window.
- Current workspace reads load all jobs/tasks/files together and the latest 200 activity entries. Older activity stays in the database. Plan server-side filtering/pagination and load testing before a large rollout; this is intended for a small TeamPlus team, not an unbenchmarked enterprise workload.

### Release and rollback

Run CI on each change, review migrations, take/verify a backup before schema changes, apply additive migrations first, then release the matching image/source commit. Check sign-in, same-team access, viewer restrictions, a full job handoff and a file download in staging. Tag/pin the tested image for rollout.

Keep the prior image for application rollback. Roll back the application only when it remains compatible with the current schema. Do not automatically undo migrations or delete records. Use a forward repair migration for schema problems; restore to a separate database if recovery is needed. Check idempotent writes after interrupted deployments so staff do not re-enter payments with new request IDs.

## Reference documentation

- [Supabase SSR sessions](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
