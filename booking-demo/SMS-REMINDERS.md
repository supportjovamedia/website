# The SMS Works reminders

This is disabled infrastructure for transactional customer reminders. It does not send marketing, confirmations, cancellations or rescheduling texts. Essential is never eligible. Standard and Premium still require server configuration, an agreed segment budget, the business preference and explicit consent on the individual booking.

Implementation tests used no live fixtures or messages. The release operator subsequently applied and verified the disabled production schema in project `rffsulstatmwzvrdgvec` and, with explicit approval, generated a provider JWT and saved it as the production-only Vercel Secret `SMS_WORKS_JWT`. The existing provider account showed zero credits. A request for the advertised 50 trial credits and notice of bundled subscription use was emailed to the provider. No credits were purchased and no SMS was sent.

## API contract

Owner RPCs require an authenticated owner of the current salon:

- `sms_reminder_info()` returns `provider`, `plan`, `eligible`, `provider_configured`, `global_enabled`, `business_enabled`, `budget_configured`, nullable `remaining_segments`, effective `enabled`, `consent_required:true`, and `reminder_hours:24`. `delivery_counts` contains scheduled, sent, delivered, failed, unknown, cancelled and suppressed counts for that business only. `needs_review` includes failed/unknown outcomes and expired Sending leases. No destination, message content or provider secret is returned.
- `set_sms_reminders(p_enabled boolean,p_salon uuid)` returns that same shape. It verifies the explicit salon against `auth.uid()`. Enabling requires Standard/Premium plus provider/server/budget readiness. Disabling cancels pending reminders and releases holds that have never reached a send attempt. It does not recall a message already passed to a provider.

Public discovery uses `public_sms_reminder_info(p_slug text)`. Its entire response is `{available,consent_required:true,reminder_hours:24}`. It exposes no plan allowance, queue details or credentials.

The existing `create_booking` signature is unchanged and remains the unchecked/default path. There is no overloaded `create_booking` function.

For checked consent, use the uniquely named `create_booking_with_sms` with the existing ten named arguments:

`p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method`

plus `p_sms_consent:boolean` and `p_request_id:uuid`. The result preserves `{ok,booking,...}` and adds `sms:{consent_saved,eligible}` on success. Consent is saved only when the server says SMS is available. A business becoming unavailable during confirmation still gets a booking, with `consent_saved:false`.

Keep a fresh cryptographic request UUID for each distinct confirmation payload. An identical wrapper request with the same UUID returns its previously committed result; a changed payload with that UUID is rejected. After an unknown HTTP outcome, retry only the same wrapper/payload/UUID or check the existing booking. Never fall back automatically to `create_booking`, which could create a second booking. Requests and their cached results are in the private schema, keyed by salon and UUID.

UK mobile input accepts spaces, parentheses and hyphens for formatting. `07` plus nine digits, `+447` plus nine digits, `00447` plus nine digits, or canonical `447` plus nine digits are normalized to the latter. Other destinations are rejected before a consented booking is created. This validates formatting rather than proving ownership or carrier country.

## Queue and dispatch

The CLI generated `supabase/migrations/20261031232653_jovabook_sms_reminders.sql`. It was applied live after its isolated SQL tests passed. It creates private config, business settings, monthly usage, queue and request records, plus `bookings.sms_consent` defaulting to false. Existing bookings are not backfilled.

The booking trigger schedules only future, consented Standard/Premium bookings. The due time is exactly 24 elapsed hours before the appointment. The validated authoritative `salons.settings.timezone` is used; missing timezone uses the legacy Europe/London default. An invalid zone or nonexistent/ambiguous DST local time suppresses scheduling rather than guessing an instant. A timezone change after scheduling invalidates the old revision at dispatch. The legacy date/time record does not have a UTC offset to disambiguate repeated local hours.

Cancellation, consent withdrawal, deletion and rescheduling cancel pending jobs. Prepared reservations are released before any attempt. Queue outcomes survive deletion of the booking so an unknown or accepted attempt is not erased. Provider transmission and a database transaction cannot be atomic: a cancellation or downgrade immediately after the final check cannot recall a POST already in flight. Such activity is retained through `cancellation_requested`, without scheduling a duplicate retry.

Workers claim leased jobs, prepare an immutable server-authored request, reserve its exact segment count, then recheck eligibility, consent, current booking revision and current budgets immediately before dispatch. Stale reminders more than 30 minutes past their due time are cancelled. Messages contain only a shortened business name, local date/time and timezone, with no customer name, treatment/service name or booking link. Provider AI optimisation is explicitly `false`.

Every queue item can enter the send attempt only once. A timeout, network failure, 5xx, missing provider ID or ambiguous acceptance becomes `Unknown`; an abandoned Sending lease also becomes Unknown. There is no automatic resend path. The provider documentation does not promise an idempotency key for `/message/send`; a tag is a correlation value, not a deduplication guarantee. A definite 4xx rejection is Failed and is not automatically retried either.

`SENT` means accepted by the network, not delivered. Only authenticated provider status retrieval for the matching message ID and destination can mark Delivered. Status polling uses GET and never sends a replacement. Numeric provider IDs are accepted only if they can be represented exactly; larger IDs must arrive as strings. No unauthenticated delivery webhook is exposed.

## Segment budgets

No commercial allowances have been chosen. Global and per-business monthly limits and per-message limits are NULL by default. NULL means unconfigured and prevents sending; zero monthly allowance explicitly means no capacity. Owners cannot read or edit private budget/config tables or increase these values through workspace settings.

The server counts GSM basic characters, two-unit GSM extension characters, and UTF-16 code units for Unicode. Limits use 160/153 units for GSM and 70/67 units for Unicode. Reservations lock the global config, business config and shared monthly counters in database transactions. Two preparations competing for the last allowance cannot overspend it. Re-preparing the same lease does not reserve twice. A reservation that crosses the UTC calendar-month boundary is cancelled and released instead of charging a different month implicitly.

Budgets count message segments, not pounds or guaranteed provider credits. Crown dependencies and international tariffs can differ even with a `44` destination. No failed or unknown attempted send is automatically refunded to the internal allowance. This conservative treatment keeps potential provider acceptance within the reserved cap. An operator may reconcile actual provider outcomes separately.

## Server configuration and commercial enablement

Keep these in the server environment only:

- `SMS_WORKS_JWT`: the account's provider JWT. The documented Authorization header contains the raw JWT, without an added Bearer prefix.
- `JOVABOOK_SMS_WORKER_TOKEN`: an independently generated 64-character lowercase hex secret. Store only its SHA-256 hash in the private database config.
- `JOVABOOK_SUPABASE_URL` and `JOVABOOK_SUPABASE_PUBLISHABLE_KEY`: narrow worker RPC access. No service-role key is required.
- `JOVABOOK_SMS_ENABLED`: absent or any value other than literal `true` prevents all worker DB/provider activity after request authentication.

The POST endpoint is `/api/jovabook/sms/worker`, authorized by `Authorization: Bearer <worker token>`. No cron was installed. The private DB flag is also false until an operator explicitly enables it. Provider readiness is a separate operator-controlled flag, not a browser-editable setting or a claim that credentials were tested.

Before commercial enablement, notify The SMS Works that JovaBook bundles SMS in paid subscriptions and resolve its reseller requirement. Clause 6 of the provider terms requires notification when reselling messages. Nobody was contacted by this implementation. Use an approved branded sender ID, not a generic term such as Reminder, which the provider documents as blocked. Agree actual global and per-business segment limits before setting them. Free account signup, credentials, sender verification and credit spending remain separate authorization decisions.

Only after a reviewed migration, credential setup, provider readiness verification and approved limits should the operator enable the DB flag, enable the server environment flag and arrange a worker schedule. A business can then opt in. Existing opted-out bookings remain opted out, and suppressed/cancelled jobs are not silently backfilled.

### Disabled configuration template and readiness

`supabase/sms_reminders_configure_disabled.sql` is a single parameterized statement, not an automatically applied migration. Bind `$1` to the SHA-256 hex digest of the server worker secret, and `$2` to the approved sender ID. Compute the digest in the server process; do not paste the worker secret or provider JWT into SQL history. This template explicitly sets global enabled/provider readiness to false and leaves both global limits NULL. Missing business rows remain implicitly disabled with no allowance; existing business preferences are not overwritten. Invalid placeholder values become unconfigured, not usable credentials.

Server environment placeholders remain unpopulated until approved:

```text
SMS_WORKS_JWT=<provider JWT, server secret only>
JOVABOOK_SMS_WORKER_TOKEN=<independent 64-character lowercase hex server secret>
JOVABOOK_SMS_ENABLED=false
JOVABOOK_SUPABASE_URL=<approved project HTTPS origin>
JOVABOOK_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
```

`supabase/sms_reminders_readiness.sql` is read-only. It reports readiness booleans, explicit segment limits, business eligibility, validated timezones, queue status counts, reservation totals, unique booking RPC signatures and private-table RLS. It returns no provider credentials, worker hash, destination or message content. It cannot prove provider JWT validity or inspect the server environment.

Deploying the schema or route does not enable sends. An absent environment flag, disabled DB config, unconfigured provider, NULL allowance, business opt-out, Essential plan or missing individual consent independently prevents dispatch. A zero-credit provider account remains unable to send and is not funded by these changes.

## Verification and limits

```powershell
node --test booking-demo/tests/sms-reminders-sql.mjs booking-demo/tests/sms-provider.mjs
```

These execute the real queue/RPC SQL in disposable in-memory PostgreSQL with mocked users, plus mocked HTTP provider/worker transport. They verify Essential rejection, consent, idempotent booking requests, tenant boundaries, immutable content, exact-cap competing reservations, cancellation/reschedule/deletion, timeout/unknown outcomes, accepted-versus-delivered statuses, timezone/DST edge cases and UTC month rollover. PGlite serializes its transport; competing calls test atomic database accounting rather than a multi-host production load test.

No provider JWT API roundtrip, delivery webhook or live delivery was validated. The operator viewed the account balance of zero and the 1 to 10,000 credit rate of 4.4p excluding VAT in the provider dashboard. The separately existing email SQL tests are also run to detect regressions. The actual provider delivery roundtrip and scheduled execution remain unperformed. Production readiness verification confirmed global sending false, all limits unset, no sender or worker key hash, zero queue records and private-table RLS enabled.

Official references checked 31 October 2026: [The SMS Works developer/auth/status documentation](https://thesmsworks.co.uk/developers), [API reference](https://api.thesmsworks.co.uk/docs/api-reference.html), [provider terms](https://thesmsworks.co.uk/terms), and [Supabase changelog](https://supabase.com/changelog.md). The Supabase skill and current relevant breaking changes were reviewed. No SDK dependency was added.
