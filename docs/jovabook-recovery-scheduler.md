# Inactive recovery scheduler

`20261101054233_jovabook_recovery_scheduler.sql` is hosted transport source only. Nothing in this change applies it to a hosted database, creates a Vault secret, changes an operational flag or sends a request.

The migration creates the private `jovabook_private.invoke_recovery_worker()` wrapper and the named cron job `jovabook-slot-recovery`, with an every-minute schedule and **active=false**. It uses `cron.schedule_in_database(..., active:=false)` inside one transaction, so the job is inactive from its first committed state. It refuses an existing job with that name rather than replacing or activating it. No customer rows are read by the scheduler.

The fixed target is `https://www.jovamedia.com/api/jovabook/recovery/worker`, with an empty JSON body. The wrapper returns null without reading Vault or enqueuing HTTP unless both private `integration_config.enabled` and `integration_config.recovery_enabled` are true. When enabled, missing, malformed or hash-mismatched worker credentials raise a constant unavailable error. No credential value is included in an exception or logging statement.

The dedicated Vault identifier is `jovabook_integrations_worker_token`. Its future value must match server-only `JOVABOOK_INTEGRATIONS_WORKER_TOKEN`, and its SHA-256 hash must match `integration_config.worker_hash`. The separate encryption key never belongs in this scheduler or Vault identifier. No secret is embedded in the cron command. The wrapper is a fixed-search-path security definer, with execute explicitly revoked from PUBLIC, anon and authenticated.

## Timeout and version checks

Supabase's current [pg_net HTTP documentation](https://supabase.com/docs/guides/database/extensions/pg_net) defines `timeout_milliseconds` for POST and states that requests begin after transaction commit. The reviewed production version was pg_net 0.20.4. Its [version-pinned implementation](https://github.com/supabase/pg_net/blob/v0.20.4/src/core.c) passes that integer to libcurl's `CURLOPT_TIMEOUT_MS`. A timeout of **330000 milliseconds** covers the route's declared `maxDuration=300` plus a 30-second transport margin, and stays below the durable dispatch lease of 600 seconds. This does not guarantee a particular hosting plan permits that duration or that a request cannot fail earlier.

The [current upstream documentation](https://github.com/supabase/pg_net) also describes `pg_net.max_timeout_ms`, with a default ceiling of 600000. That newer setting must not be assumed present in 0.20.4. If the setting exists, the migration refuses a ceiling below 330000; it never changes server settings or silently reduces the timeout. Future activation must verify the deployed Vercel duration allowance and the installed pg_net behavior. Do not copy the older email scheduler's 55000-millisecond timeout onto this handler.

An HTTP timeout or failed cron execution is not permission to start another campaign. Existing dispatch leases and point-of-no-return state govern retries. After Sending, a disconnect may still be followed by provider initiation; retired credentials support only GET reconciliation of that same campaign. The scheduler cannot cancel an already initiated send.

## Privilege and operational assumptions

Installation requires an administrator/migration role able to create or access pg_cron and pg_net, read cron.job, create a private function and execute `cron.schedule_in_database`. In [pg_cron 1.6.4's definition](https://github.com/citusdata/pg_cron/blob/v1.6.4/pg_cron--1.3--1.4.sql), execute on schedule_in_database is revoked from PUBLIC. Do not grant it broadly to application users to make installation pass.

The migration role becomes the wrapper owner and cron execution username. That role must retain execute on its own private wrapper and the necessary Vault-view, integration-config and pg_net privileges. The scheduler assumes it runs in the same database, with the extension background workers properly installed and the cron role able to connect. Actual hosted pg_cron permissions and worker execution are not proved by the offline fixture.

Vault stores the credential encrypted, but pg_net necessarily places a bearer header in its internal request queue before transport. Access to that queue and Vault must remain administrator-only. Review logging configuration before activation: pg_net 0.20.4's upstream code can enable libcurl verbose output at DEBUG2. Do not enable verbose/debug transport logging for this authenticated worker, and do not dump queue headers or decrypted Vault values during checks.

Activation is separate work: review/apply the migration, configure matching dedicated credentials safely, verify server and SQL flags, complete Mailchimp/consent/readiness checks, and explicitly activate the job only after permission for real sends. After activation, inspect safe job names/schedules, execution status and sanitized HTTP status metadata. A successful cron enqueue does not prove provider acceptance or recipient delivery.

## Offline verification and manifest

Add this exact file to **OMITTED_SOURCE_FILES**, alongside the email scheduler:

`migrations/20261101054233_jovabook_recovery_scheduler.sql`

Do not add it to SOURCE_FILES. The embedded PGlite database intentionally rejects network, cron and extension transport code. This change does not edit the root-owned manifest.

Run `node --test tests/jovabook-recovery-scheduler.test.mjs`. Static validation checks the fixed endpoint, dedicated identifier, both flag guards, finite timeout, private privileges, inactive job and absence of embedded secrets or debug statements. Disposable PGlite tests replace extension APIs with local SQL stubs to prove disabled/missing/mismatched credential behavior, exact enqueue arguments and privilege revocation. These stubs make no HTTP requests and do not prove real pg_cron or pg_net execution. No production secrets, customer records, provider calls or messages are used.
