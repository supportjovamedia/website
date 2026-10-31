# JovaBook testing

The persistent test database is an embedded PostgreSQL engine, PGlite, on this computer. It is separate from the live Supabase project and from the browser demo.

It costs nothing to run, needs no Docker or hosted project, and uses the PGlite development dependency already in this repository. No packages are installed by the CLI.

## Run the local database

From the repository root, in a local development shell:

```sh
node scripts/jovabook-test-db.mjs init
node scripts/jovabook-test-db.mjs status
node scripts/jovabook-test-db.mjs verify
```

The same commands work in PowerShell and on Linux. Storage is fixed to:

```text
<repository>/.jovabook-test/data
```

There is no URL or configurable path. Running the command from another working directory does not change its database location. The database files persist between CLI runs. They are outside `booking-demo`, the directory used for static publishing, and must remain excluded from Git and deployment packages.

`init` creates the marked database and fictional fixtures once. Running it again reports the existing database. `status` reports initialization, fixture counts, migration-source drift and disabled delivery. `verify` runs database checks in a transaction and rolls back its probes, leaving the fixture records intact.

To rebuild only these local fixtures:

```sh
node scripts/jovabook-test-db.mjs reset --confirm=test-only
node scripts/jovabook-test-db.mjs verify
```

The literal confirmation option is required. Reset drops and recreates the owned test schemas using SQL. It does not recursively delete or move filesystem paths. It has no way to select a hosted database or another local directory.

## What is loaded

The CLI applies the actual repository SQL in this order:

1. `booking-demo/supabase/setup_new_project.sql`
2. `booking-demo/supabase/migration_owner_experience.sql`
3. `booking-demo/supabase/migration_subscription_requests.sql`
4. `booking-demo/supabase/migrations/20261031161318_jovabook_email_delivery.sql`

The local bootstrap supplies mock `auth.users`, `auth.uid()` and the `anon`, `authenticated` and `service_role` database roles needed to exercise the policies. The owner and anonymous checks switch PostgreSQL roles and a transaction-local identity claim. They do not create real Supabase users or login credentials.

The fixture set contains two fictional businesses, each with one category, service, calendar, synthetic client and future booking. All owner, client and queue-recipient addresses end in `@example.test`. No production records, passwords, SMTP credentials or customer data are copied.

The booking trigger creates ordinary SQL email-event and queue records for the synthetic bookings. These are records to inspect, not sent emails:

- `email_config.enabled` is `false`.
- The worker token hash and webhook credentials are `null`.
- The sender is `bookings@example.test` and booking links use `https://booking.example.test`.
- No worker, scheduler, SMTP server or delivery provider is connected.

`pg_cron`, `pg_net`, the hosted email scheduler migration and transport extensions are omitted. They are not available in this embedded engine. An optional `CREATE EXTENSION pgcrypto` statement is removed when reading schema sources because PGlite already provides the PostgreSQL primitives used by these schemas. The SQL splitter preserves quoted strings, comments and function bodies. Other extensions or transport SQL are refused.

Source hashes are stored inside the database. After schema files change, `verify` asks for an explicit local reset so it does not silently claim that an older database represents the current source.

## Safety boundaries

The CLI refuses database URLs, alternate paths and unknown options. It does not read `.env` files. Nonempty database, Supabase and email-provider environment settings cause a refusal that names the variable without printing its value. Production or hosted application runtimes are also refused. Use a separate clean shell rather than repurposing a production environment.

Before opening or resetting storage, the CLI validates the fixed local path, its repository-bound `marker.json`, regular files and the absence of symbolic links or Windows junctions anywhere inside the storage tree. It also checks an internal test-only database marker. Unexpected or missing markers are refused. Do not copy production data or another database into this directory.

The CLI disables outbound fetch, socket, HTTP, HTTPS, UDP and DNS entry points in its own process before loading PGlite. No browser server, Supabase SDK connection or network database adapter is started. The application never imports this script and cannot connect to this database through a runtime URL.

One CLI process may open the persistent database at a time. A lock prevents concurrent commands. If a command is interrupted and a later command reports a stale lock, first confirm that no test-database CLI process is still running. Then remove only `.jovabook-test/cli.lock`. Keep `marker.json` and the `data` directory. A changed or unsafe lock is never removed automatically.

If initialization is interrupted after the internal marker is created, use the confirmed reset command. If the marker or path checks fail, stop and inspect the local directory. Do not bypass the guards or point the tool at another database.

## What verification covers

The persistent database checks verify that:

- Both owners read only their own business rows, including overlapping row IDs.
- Cross-business inserts, moves and deletes are denied.
- Subscription requests remain bound to the correct business.
- Email activity is read-only for the owner, and the private email queue is inaccessible.
- Anonymous users cannot read client or booking tables.
- Public booking information omits client identity.
- Delivery remains disabled, transport extensions are absent, and recipients remain synthetic.

These are SQL and row-level-security checks. This database does **not** run Supabase Auth/GoTrue, PostgREST, Edge Functions, the live email provider, scheduled jobs or a local HTTP Auth API. Passing these checks does not prove an end-to-end live account or email-delivery flow.

## Other test layers

Focused CLI guard and parser tests:

```sh
node --test tests/jovabook-test-db.test.mjs
```

Disposable database and mocked adapter tests:

```sh
node --test booking-demo/tests/data-isolation-audit.mjs booking-demo/tests/data-isolation-audit-sql.mjs
node --test booking-demo/tests/email-delivery.mjs booking-demo/tests/email-delivery-sql.mjs
```

Actual application browser checks with intercepted, fictional local services:

```sh
node booking-demo/tests/host-isolation-browser.mjs
node booking-demo/tests/email-delivery-browser.mjs
```

The browser tests cover account switching, stale responses, recovery callbacks, simulated Auth errors, canonical values after saves, unsaved editors, demo isolation and email status UI. They mock the Auth and database APIs. Any password update in those tests targets the local mock only.

An explicitly approved live Auth verification was completed earlier, and its temporary fixture was deleted. That past verification does not authorize another production test. Future production account creation, password changes, customer-data operations or email sends require separate explicit approval. The default workflow is this local database plus isolated browser and adapter tests.
