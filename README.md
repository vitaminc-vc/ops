# Vitamin-C platform

TanStack Start + React + TypeScript, with Drizzle ORM, Supabase PostgreSQL, and Better Auth email/password authentication. Three areas: Vitamin-C brain, portfolio management, and LP Engine. The chat and sidebar adapt Beautiful UI’s MIT-licensed public components; see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Run

Requires Node 22.12 or later.

```sh
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://localhost:3000. The server binds to the local computer only.

```sh
npm run typecheck
npm run build
npm run db:check
npm run check:auth
```

Run `check:auth` while the dev server is running. It creates temporary accounts with unique `example.invalid` emails, exercises authorization and streaming, then deletes only the exact account IDs it created. It requires database access and must target a local app. To check another port, use `npm run check:auth -- http://127.0.0.1:PORT`. The standalone stream check requires an authenticated session via `VITAMIN_C_TEST_SESSION_COOKIE`; the auth check supplies this automatically without printing the cookie.

## Database and authentication setup

Target Supabase project: `euaxzitprzcazefjfjuu`, Vitamin°C, Frankfurt. The schema and server-policy migrations have been applied through this project's dashboard and recorded in `vitamin_migrations.__drizzle_migrations`. The four Better Auth tables are in the private `vitamin_auth` schema, outside Supabase's reserved `auth` schema and exposed `public` schema. RLS is enabled, with policies granting access only to the trusted `vitamin_c_app` database login. Schema/table access remains revoked from `PUBLIC`, `anon`, and `authenticated`. The migration ledger is also private and unavailable to the runtime app login.

The app uses Better Auth sessions and its own admin/scout authorization checks. Supabase Auth users and JWTs do not automatically grant app access. Better Auth users appear in `vitamin_auth.user`, not Supabase's Auth Users screen.

1. The approved `vitamin_c_app` login and its generated password are configured in this checkout's ignored `.env.local`. On another checkout, populate `SUPABASE_DB_PASSWORD` from the app's credential storage. The verified IPv4 session-pooler host and restricted username are prefilled. Alternatively provide `DATABASE_URL`; use `DATABASE_MIGRATION_URL` for a separately privileged migration connection. The original `postgres` password has not been changed.
2. Set `BETTER_AUTH_SECRET` to a random secret of at least 32 characters and `BETTER_AUTH_URL` to the app origin. A local secret has already been generated for this checkout. Never expose these values with a `VITE_` prefix or commit `.env.local`.
3. Run `npm run db:check`. For schema updates, supply a privileged `DATABASE_MIGRATION_URL` and run `npm run db:migrate`, or apply the generated SQL through the dashboard SQL Editor. The runtime app login deliberately cannot run migrations. Migration URLs must identify the Vitamin°C project to prevent accidental writes to another Supabase project.
4. Restart `npm run dev` after changing environment variables. Create your account at `/login`, then promote the specifically selected first admin:

```sh
npm run auth:admin -- --email your-email@example.com
```

Sign in again after promotion. The bootstrap command only promotes an existing account and refuses to add an additional admin once an admin exists. Subsequent role changes happen in **Team access**.

The initial admin is `luke@vitaminc.vc`. Its account is registered and the admin role has been applied and verified. The ignored local environment stores this address as `BOOTSTRAP_ADMIN_EMAIL` for the idempotent bootstrap command. Setting this value does not grant privileges through public signup.

| Role | Brain | Portfolio | LP Engine and LP chat context | Team access |
| --- | --- | --- | --- | --- |
| Admin | Yes | Yes | Yes | Yes |
| Scout | Yes | Yes | No | No |

Every signup defaults to scout. Clients cannot set or update their own role. The database accepts only `admin` and `scout`; custom mutation routes check request origin and authenticated permissions. Role changes revoke the affected user's sessions, and the current admin cannot demote themselves. A transaction lock serializes role changes and protects the last admin. Browser caches are scoped to user ID and role and do not import the old shared demo cache.

Database connections use a small node-postgres pool (five runtime connections, one migration connection) with SSL certificate verification. The public Supabase Root 2021 CA supplied by the dashboard is included in `certs/` and configured through `DATABASE_SSL_CA_PATH`; verification remains enabled. The database check inspects the actual app-to-pooler TLS socket, because `pg_stat_ssl` describes the pooler's separate upstream connection. The runtime app login has no superuser, database-creation, role-creation, replication, schema-creation, or RLS-bypass privileges; it has a ten-connection limit. Keep migration credentials separate. Production auth requires HTTPS. Email verification and password-reset delivery need a mail provider before those flows can be offered; they are not claimed as configured. The built-in in-memory auth limiter is suitable for this single local process; configure shared rate-limit storage before running multiple production instances.

The approved provisioning SQL in `scripts/sql/provision-app-login.sql` has been applied. It created the `vitamin_c_app` login with data access only to the four private auth tables and matching server RLS policies. It refuses to reset an existing role. Future schema migrations need privileged database credentials or the dashboard SQL Editor. Public signups still default to scout; this database login is separate from application admin/scout roles.

Schema changes use `npm run db:generate`, followed by reviewing the generated SQL and `npm run db:migrate`. Do not run `drizzle-kit push` against this project; preserve migration history.

## Implemented UI

- Collapsible harness-style sidebar, platform navigation, searchable chat history, and browser-persisted conversations and drafts.
- Chat composer, context picker, HTTP streaming, loading state, expandable thinking activity, expandable tool chips, markdown responses, source details, follow-up prompts, copy, feedback, stop, and retry.
- Live Airtable company table with search, missing-report filter, company details, reported financials, call preparation, and CSV export.
- Admin-only connectors and settings: source-backed thesis, assessment guidance, scout source permissions, selected Notion page setup, and draft email screening.
- LP discovery and connection filters, investor review, pipeline stages, editable saved introduction drafts, and local CSV import with duplicate-name matching and review.
- Keyboard-accessible dialogs and pickers, white focused fields, compact mobile layouts, and reduced motion styles.
- Sign-in/signup/sign-out, protected workspace routes and chat API, authenticated account identity, admin/scout gates, and an admin account-management page.

## Current deployment and data

The shared app runs in Burton Algorithms' Railway workspace at https://vitamin-c-platform-production.up.railway.app. See [current readiness, verification and owner actions](docs/demo-handoff.md).

Approved founder emails and supported attachments are screened before storage in private Supabase tables and Supermemory. Companies and original files are available to admins. The n8n replacement draft reads complete threads and attachments; the old unscreened workflow is unpublished. Execution capacity on the Vitamin-C instance is still required before publication and live delivery verification.

Portfolio management reads the approved Airtable base directly (one company, no financial submissions at verification). LP Engine displays the actual 405-entry Claude project snapshot, clearly dated; live Attio research is awaiting its sources. Startup assessment and Scout pages store run history and use the imported Claude rubrics. Scout is blocked until the full Notion pipeline can be checked.

Better Auth Google sign-in and own-mailbox connections are implemented but awaiting the Google web client. Existing password accounts can sign in; production password signup is disabled. Notion company/file sync awaits a token with access to the confirmed deal database. Google Drive, Granola, Novata and LinkedIn are not connected. The app sends no outreach.

Encrypted integration configuration uses a persistent Railway volume and supports one app instance. Better Auth, companies, files, mailbox registrations and runs use private Supabase schemas. Email/LP/admin routes enforce current server-side roles; clients cannot choose arbitrary memory containers. Chat history remains user-scoped browser storage.

## Verification

TypeScript, client/server production builds, and schema generation pass. Auth and streaming checks passed first against isolated local PostgreSQL and then against the real Supabase database using the restricted app login: signup/signin/signout, password hashing, cookie flags, forged-role rejection, protected routes, scout restrictions, origin checks, role changes, session revocation, incremental streaming, sources, and cancellation. Remote checks created uniquely named temporary `example.invalid` accounts and deleted their exact IDs afterward. The database checks verify RLS, denied Data API access, and certificate-verified app TLS. The runtime login was also verified unable to create objects in the auth schema or access migration administration. The dependency audit reports zero vulnerabilities after the esbuild override for Drizzle's development tooling.

Earlier UI checks covered loading, citations and tool details, stop/retry, company navigation and financials, LP draft reload, CSV duplicate handling and navigation persistence, sidebar collapse/expand, scope-picker keyboard selection, white focused fields, and a 390px phone layout. Reduced-motion behavior is wired through Motion and CSS; the system preference was not toggled during browser checks.

The new auth UI was verified at desktop and 390px widths: invalid credentials, successful signup and signin, role-specific navigation, the admin account list and role-change review/cancellation, mobile sign-out, and white focused fields without horizontal overflow. All browser auth checks used the isolated local test database.

## Email knowledge pilot

See [the n8n setup and verification notes](integrations/n8n/README.md). The replacement cloud workflow calls the shared Railway app. It awaits Vitamin-C n8n capacity; the app keeps its Supermemory key server-side.

Local QA evidence in `artifacts/`, credentials in `.env.local`, and encrypted integration state and workflow exports in `.private/` are ignored by Git. Handoff documents refer to local evidence that is not included in a fresh clone.
