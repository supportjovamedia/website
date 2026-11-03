# JovaBook owner funnel

Collection is disabled by default. This is optional consent-based measurement, not the business billing ledger. No client data, authentication URLs, replay, card fields, Stripe identifiers or IP/fingerprints are sent to Google.

## Events and reporting

| Stage | Event | Evidence |
| --- | --- | --- |
| Trial CTA | jovabook_trial_interest | Existing consented marketing click |
| Plan choice | jovabook_plan_selected | Existing consented click with plan/cadence |
| Registration landing | jovabook_registration_view | One-use anonymous handoff redeemed at owner signup |
| Registered | jovabook_registered | Verified owner and genuinely new business, after email verification/password login |
| Card trial | jovabook_trial_started | Existing billing canonical trial_verified + successful sync_apply |
| First actual subscription payment | purchase | Signed invoice.paid observed after verified billing state, then separately retrieved invoice/approved price and positive succeeded PaymentIntent after the trial |

Registration means a verified, linked business. An email-verification request alone is not counted as a completed registration. Legacy accounts and unconsented journeys are not backfilled.

Register event-scoped dimensions: initial_plan, initial_cadence, converted_plan, cadence, funnel_stage, initial_source, initial_medium, initial_campaign, initial_content, initial_term. Create a 30-day user funnel with the stages above. Mark jovabook_registered, jovabook_trial_started and purchase as key events as appropriate. Keep click intent, trials and paying businesses separate. Initial plan and actual converted plan are separate when an owner changes their selection. GA4 users are consenting browser instances, not unique people or IP addresses.

Purchase uses the actual provider paid_at timestamp, an opaque transaction ID, and actual positive collected subscription amount (excluding commission lines), converted from minor units to GBP. Credit-balance and ambiguous multi-payment invoices are conservatively excluded. The first recurring line must start at the trial boundary; later renewals cannot be relabelled the first trial conversion. Delayed events keep client_id but do not reuse the original session_id or backdate into the signup session. Only the registration landing uses its originating session. Safe campaign fields are explicit initial_* parameters, not a claim that GA4 attributed a three-day-later payment to an active signup session.

## Consent and privacy

Marketing GA4 stays under its existing public-page allowlist. Clarity remains excluded from all booking/auth/customer/operator pages. No analytics runtime is loaded on the owner application: it only sends allowlisted funnel API messages. Cookie names jova-funnel-consent and jova-funnel-cap are explicitly Domain=.jovamedia.com; Path=/; Secure; SameSite=Lax, max30 days. Existing optional marketing consent must be accepted before anonymous GA identifiers are read for handoff. Rejecting either site's cookie settings stops new events, clears analytics cookies where accessible and requests server revocation.

The initial handoff expires in15 minutes and is rotated once on landing. Only hashes are stored server-side. The original hash remains revocation-only, covering withdrawal concurrent with rotation. The capability is removed from the URL immediately and never reaches analytics URLs. A rotated capability also supports verification/login in another tab on the same browser. Cross-device registration cannot be attributed without that consented browser handoff.

Binding requires fresh server Auth verification, confirmed email, actual owner_account_access and matching database ownership. A business created before the journey cannot be relabelled a new registration. No Auth metadata is trusted for authorization. The private outbox is service-only, with RLS and no direct browser access.

Revocation removes queued and claimed unsent rows, rejects future enqueue, and each worker rechecks consent before provider proof and dispatch. A request already dispatched cannot be recalled. If withdrawal is offline, the rejected root cookie stops browser activity and a retained revocation capability retries when connectivity returns. The server cannot learn an offline choice until that request arrives. Records expire after30 days, purged by worker after a one-day grace. Delivery never changes event timestamps and discards events older than72 hours.

## Deployment/configuration, collection remains disabled until completed

1. Review/apply migrations 20261103222916_owner_funnel.sql and 20261103224835_owner_funnel_scheduler.sql using the normal release process. No live migration is applied by the implementation tests.
2. Set server-only JOVABOOK_SUPABASE_URL, JOVABOOK_SUPABASE_PUBLISHABLE_KEY and existing JOVABOOK_SUPABASE_SERVICE_ROLE_KEY. Do not put a service key or GA API secret in NEXT_PUBLIC variables or booking config.
3. Create GA4_MEASUREMENT_API_SECRET for the existing Web stream; set GA4_MEASUREMENT_ID=G-YGPGYJ9L9B. Set a separate random 64 hex JOVABOOK_FUNNEL_WORKER_SECRET.
4. The scheduler migration installs private invoke_funnel_worker() and an inactive Supabase cron job jovabook-owner-funnel on */5 * * * *. It uses the existing pg_cron/pg_net/Vault pattern, fixed HTTPS target, empty JSON body and a 55-second HTTP timeout. The route has no public GET action, declares a 45-second maximum, a 30-second scheduling budget, at most five rows and at most one PaymentIntent proof per candidate. Follow the explicit activation steps below only after secrets match. The scheduler has a separate disabled-by-default switch and makes no request without a valid dedicated Vault token.
5. Retain existing billing Stripe credentials. The separate analytics worker additionally reads invoices, invoice line items, InvoicePayments and PaymentIntents. It never creates/changes a Stripe object. Restricted keys need these optional read scopes reviewed, not automatically expanded. Missing permission leaves a bounded retry/unknown conversion, never a payment failure or invented sale.
6. Set JOVABOOK_FUNNEL_ENABLED=true only after the above are reviewed. Without the flag, API secret, worker secret and database configuration, no collection/delivery begins. Revocation remains callable when collection is disabled.
7. Verify with local synthetic/intercepted requests first, then separately inspect GA4 event receipt and reporting configuration after authorized deployment. An HTTP2xx collection response is dispatch acknowledgment, not proof of GA4 report ingestion.

Signed billing observations are scheduled with Next after(), after the critical HTTP response. They only enqueue into the private outbox; no optional Google or new Stripe proof requests run in checkout/reconciliation/webhook responses. Core financial state and eligibility are unchanged. Positive paid proof occurs only for a candidate already bound to active consent. Trial/paid deduplication uses business-event keys independently of Stripe webhook IDs. Worker leases and bounded retries prevent concurrent replays. Purchase has a stable opaque transaction_id; a lost external acknowledgment can still cause a transport retry, so generic custom event delivery is at-least-once, not an exactly-once guarantee from Google.

## Private five-minute scheduler activation

The migration does not create or embed a secret. Configure the same random 64-character lowercase hexadecimal value as encrypted Vercel JOVABOOK_FUNNEL_WORKER_SECRET and Vault secret named jovabook_funnel_worker_token. Use the Vault UI or a parameterized admin call, never committed SQL containing a real value:

```sql
select vault.create_secret($1, 'jovabook_funnel_worker_token', 'Owner funnel delivery worker only');
```

After the migration, worker deployment and encrypted configuration have been reviewed, activate only this independent scheduler:

```sql
update jovabook_private.funnel_scheduler_config set enabled=true where singleton;
select cron.alter_job(jobid, active:=true)
from cron.job where jobname='jovabook-owner-funnel' and database=current_database();
```

To stop subsequent scheduled calls, set enabled=false first, then deactivate the job:

```sql
update jovabook_private.funnel_scheduler_config set enabled=false where singleton;
select cron.alter_job(jobid, active:=false)
from cron.job where jobname='jovabook-owner-funnel' and database=current_database();
```

Missing or malformed dedicated Vault token, absent configuration or disabled switch returns without queuing HTTP. Anonymous, authenticated and service roles cannot inspect/enable the scheduler or invoke its private function. Billing, SMS and other worker secrets/configuration are not reused or changed. pg_net briefly queues the decrypted Authorization header before sending, as in the existing worker pattern; Vault does not remove that queue boundary. Keep database queue access restricted to trusted administration. No token or HTTP headers are included in cron command text or application logs.

The scheduler migration is explicitly omitted from the offline schema manifest. Dedicated PGlite tests replace only pg_net/Vault/cron transports with local tables/functions, then execute the actual guarded scheduler function. The regression script runs these tests, the API/real-SQL conversion pipeline and actual intercepted Chrome consent proof. No test invokes the real scheduler, database or provider.
