# Scheduled commission processing

The source now includes a supervisor that discovers and processes one due business per scheduled request. It does not need a caller to enumerate salon UUIDs. This source change has not installed a hosted job, set a Vault secret, enabled collection or contacted a payment provider.

## Entrypoint and authority

`POST /api/jovabook/billing/commission-supervisor` accepts only `{}` with bearer `JOVABOOK_COMMISSION_HTTP_TOKEN`. This must be a 64-character lowercase hexadecimal secret, independent of `JOVABOOK_COMMISSION_WORKER_TOKEN`. Browser credentials, salon UUIDs, invoice IDs and other body fields are refused. The existing exact-business commission-worker endpoint remains available for authorized diagnostics and signed invoice hooks.

Environment `JOVABOOK_COMMISSION_SUPERVISOR_ENABLED` and private SQL `commission_config.supervisor_enabled` both default off. Existing billing and commission gates remain required. Private `supervisor_operational_ready` also defaults false and prevents annual subscription sales until an operator has verified the deployed route, matching token and active schedule. The supervisor can be exercised during that setup before this sales-readiness flag is set. The server passes only the HTTP secret's hash to its token-protected database claim; it must match `supervisor_http_hash`. A stale server or mismatched Vault secret cannot claim businesses after a secret rotation.

Eligibility requires a paid-account history, bound provider customer and subscription, a supported reviewed commission terms version with an acceptance timestamp, no deletion lease, and ready private billing/commission configuration. An eligible database row is not proof of a payable invoice. Each refresh independently checks the actual merchant, approved price/cadence, customer/subscription binding, paid historical tiers, saved payment method where needed, consent and commission window. Missing or inconsistent provider state schedules a retry without granting access or taking an invented fee.

## Due work, leases and fairness

The private `commission_refresh_jobs` table records the next refresh, a ten-minute lease, attempts, bounded failures and generic outcomes. It contains no client contact data, provider diagnostics or secrets. Browser roles cannot read or write it.

Each claim takes the same advisory-first owner lock used by billing and staff writes, then locks/rechecks the job. Simultaneous ticks cannot lease the same business. A terminated worker's lease expires; a replacement gets a different UUID. The old worker cannot finish, release or overwrite the replacement's outcome.

A successful refresh runs again within twelve hours, sooner when a verified commission boundary is nearer. Unresolved financial recovery receives a five-minute check. Failure backs off from five minutes to six hours. An unsuccessful business does not prevent a different due business from being claimed. The supervisor uses the existing financial ledger and its immutable provider keys, so a fresh scheduling lease never resets an unknown invoice or payment operation.

The tick returns counts: `attempted`, `processed`, `retry_scheduled` and `summary_available`. A processed refresh means the provider-backed state was refreshed, not that money was collected. Failed provider calls retain retry state and do not produce a successful refresh timestamp. Unknown worker/finish outcomes leave the lease available for later reconciliation.

One tick processes one business. An every-minute schedule provides up to 1440 attempts per day before failures or long-running calls. Monitor the oldest due job and statement age as the tenant count grows, and increase scheduled tick capacity before this bounded cadence cannot maintain freshness. There is no claim of unlimited throughput or an exact instant-of-renewal SLA.

## Monthly and annual execution

For annual subscriptions, a tick can create the separately reviewed monthly commission invoice at an elapsed anniversary, carry an unbilled fee forward, settle a previous unknown outcome, or refresh the daily statement. Premium with no carried fees creates no empty monthly invoice. Subscription prices are not added repeatedly to monthly annual-plan statements.

For monthly subscriptions, the supervisor also discovers one canonical automatic draft renewal if its `invoice.created` webhook was missed. The existing approved base-line/cutoff and exact commission checks run before reservation or collection. Multiple unexplained draft renewals fail closed. Regular webhook processing remains in place; scheduler execution does not trust a guessed browser invoice or renewal date.

## Inactive managed schedule

CLI-created migration `20261101054615_jovabook_commission_supervisor.sql` installs only the network-free due queue and gateway on ordinary PostgreSQL. The separate CLI-created `20261101055544_jovabook_commission_scheduler.sql` contains the managed transport wrapper and schedule. It is explicitly omitted from the strictly offline database manifest. If `cron.job` is present, the scheduler transaction creates the named `jovabook-commission-supervisor` job with schedule `* * * * *` and sets it inactive before commit. It does not create managed extensions. If a job with that name already exists, migration stops for review rather than silently changing it.

The job invokes only private `jovabook_private.invoke_commission_supervisor()`. That function is not executable by public, anon or authenticated roles. It checks the SQL flags and matching independent secret hash before reading the one Vault entry named `jovabook_commission_http_token`. It posts an empty JSON body to the fixed URL `https://www.jovamedia.com/api/jovabook/billing/commission-supervisor`, with a 330000ms pg_net timeout. The route declares a 300-second runtime budget, below the ten-minute lease.

Use the existing verified Supabase Cron/Vault/pg_net pattern. The actual target's pg_net 0.20.4 supports `timeout_milliseconds`; this source does not assume a newer timeout GUC exists. Restricted access to pg_net queues/responses must be reviewed because transport headers can temporarily contain its bearer token. Never print headers or store the raw secret in repository SQL, the cron command or diagnostic output.

Activation requires deployment of the route, both supervisor switches, the matching Vault/server HTTP secret and private hash, existing independent ledger worker credentials, provider permissions, verified billing/commission readiness and an explicit activation of the otherwise inactive named cron job. After proving the deployed scheduler runs correctly, an operator can attest that readiness with `supervisor_operational_ready=true`. Annual availability additionally verifies that flag, the server supervisor setting, the independent HTTP token hash and the server billing-worker binding; a missing supervisor schema safely leaves annual billing unavailable. Annual fee collection retains its additional annual switches. No activation SQL containing a real token is supplied here. Confirm readiness and complete test-mode lifecycle verification before enabling money movement.

## Local verification

```text
node --test booking-demo/tests/commission-supervisor-sql.mjs booking-demo/tests/annual-billing-backend.mjs
```

The SQL suite passes core migrations through the unchanged strict offline SQL guard. It directly loads the separate scheduler migration only into managed-service fixtures, and asserts that the guard rejects that transport file. Its managed-service fixtures replace Cron, Vault and pg_net with local tables/functions, so invoking the tested wrapper records one in-memory request and never opens a network connection. It checks inactive creation, role denial, secret mismatch, eligible tenant scope, lease exclusion, stale completion, fair/bounded backoff, nearer boundaries and cleanup. Backend scenarios use injected fictional Stripe transport to prove one actual annual refresh, missed monthly renewal recovery and a failed canonical price check recorded as retry.
