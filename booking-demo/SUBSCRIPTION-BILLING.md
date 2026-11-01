# JovaBook subscription billing and retention

This implementation is source code plus isolated PostgreSQL and mocked Stripe tests. It has not created Stripe customers, charged cards, applied its migration to a hosted project, or deleted hosted accounts. Subscription collection and destructive retention are disabled by default. Deploying the files does not enable either operation.

## Access rules

The database starts the first trial when a business row is registered. Its private timestamp uses database time and the verified Auth account email, rather than browser time, the business contact email or a mutable business creation date. Trial access lasts exactly 72 elapsed hours. After that, only subscription/support/logout access remains for another 48 elapsed hours.

A salted normalized-email fingerprint records that a trial was used. Deleting a business does not delete that minimal ledger. A subsequent registration using the same normalized Auth email receives no trial and gets a fresh 48-hour payment-only registration window. Onboarding cannot hold an account in unrestricted `setup` indefinitely. Calling `start_trial` repeatedly cannot restart its clock, and the former unpaid `resubscribe` shortcut is rejected.

Only a current verified provider payment grants a paid entitlement. An unpaid recurring invoice or `past_due`/`unpaid` provider state locks private business data immediately. A paid period ending without renewal also locks access when its verified end passes, even if a webhook is late. Retention for an unpaid paid account is two UTC calendar months from the first failure, or the verified paid-period end for a scheduled cancellation. It is not a fixed 60-day interval. Payment verified before final deletion restores access and cancels the deletion lease.

Restrictive owner RLS covers business/diary tables, and the existing public booking and website RPCs have database clock guards. Subscription metadata remains available through `owner_account_access()` without loading the diary. The later customer-portal migration owns authenticated existing-booking viewing/cancellation/refund rules. New public bookings and the public business website remain disabled when the business is locked.

## API contract

All owner endpoints are POST, accept a Supabase bearer token, verify that token through `/auth/v1/user`, and resolve the actual owner business on the server. An optional `salon_id` must match that business. Provider customer IDs, owner IDs and price IDs are not accepted from the browser. Responses use `Cache-Control: no-store`.

| Endpoint | Body | Successful result |
| --- | --- | --- |
| `/api/jovabook/billing/status` | `{}` or `{salon_id}` | Minimal access/business/lifecycle/billing metadata |
| `/api/jovabook/billing/checkout` | `{salon_id?, plan, request_id}` | `{ok:true,kind:'checkout',url}` or `kind:'recovery'` |
| `/api/jovabook/billing/change` | `{salon_id?, plan, request_id}` | Hosted `kind:'upgrade',url`, or `kind:'scheduled',plan,effective_at` |
| `/api/jovabook/billing/cancel-change` | `{salon_id?, request_id}` | `kind:'schedule_cancelled'` |
| `/api/jovabook/billing/cancel` | `{salon_id?, request_id}` | `kind:'cancellation_scheduled',effective_at` |
| `/api/jovabook/billing/webhook` | Raw Stripe event and signature header | Signed, reconciled event acknowledgment |
| `/api/jovabook/billing/lifecycle` | `{mode:'dry_run'}` or `{mode:'execute',salon_id}` or `{mode:'cleanup'}` | Separate server-only worker result |

`request_id` is a stable UUID for an identical owner action. Reusing it with a different target is rejected. The browser must retain the same ID after an unknown outcome and must not retry through a legacy payment path.

Status returns `access`, `reason`, `server_now`, `full_until`, `business`, `lifecycle:{trialEndsAt,purgeAt}`, top-level `staff_limit`, and `billing` containing `connected`, `canCheckout`, `paid_until`, `current_period_end`, `pending_plan`, `pending_effective_at`, `cancel_at_period_end`, `staff_count`, `commission_bps`. Dates without an authoritative value are null. Missing metadata is a closed access gate, not permission to load cached diary records.

A confirmed Auth identity without an owned business receives HTTP 200 with `{ok:true,no_business:true,access:'no_business',reason:'no_business',business:null}` and null access/lifecycle dates. This is an explicit onboarding state, never diary access. A supplied stale business ID is rejected. Mutating billing routes refuse this state.

For an Auth identity retained because it is a customer elsewhere, the authenticated RPC `create_business_for_existing_user(p_name,p_slug,p_owner)` provides explicit business registration. It derives the owner UUID and confirmed email solely from Auth, refuses an existing owned salon, and reuses the existing slug/name/email rules. It returns `{ok:true,salon_id,access}` or a field error. Customer sign-up/login does not invoke it automatically. The private registration trigger decides whether the user gets their first 72-hour trial or a repeat 48-hour payment-only window. No existing customer memberships are changed.

Hosted URLs are restricted to HTTPS, no custom port or credentials, and the exact applicable Stripe host: `checkout.stripe.com`, `invoice.stripe.com` for recovery, or `billing.stripe.com` for upgrade confirmation. Return URLs are fixed to `https://book.jovamedia.com/#billing`. A return URL never activates a plan.

Disabled or commercially unapproved billing returns 503 with `billing_unavailable:true`, permitting a separate explicit request-only flow. A real provider/verification error returns 503 without that flag. It must not cause a charge through another route or a local entitlement change.

## Subscription changes and provider state

The approved catalog is Essential GBP20/month with one staff member, Standard GBP50/month with five, and Premium GBP100/month with ten. The parent agent verified JovaMedia merchant `acct_1UP5eRRAVakCVqQ0` (`Jovamedia_Acc`) and created the following live monthly prices without any charges. These IDs are public catalog identifiers, not credentials. Source tests use separate fictional test IDs, and no production enablement follows from this table.

| Plan | Live monthly price ID |
| --- | --- |
| Essential | `price_1UWn5CRAVakCVqQ0REqlkdIf` |
| Standard | `price_1UWn6nRAVakCVqQ0hPMgUDkt` |
| Premium | `price_1UWn83RAVakCVqQ0VDo079fC` |

The server compares `accounts.retrieveCurrent()` with its configured expected merchant ID and requires `charges_enabled=true`, so a key belonging to another business or an account unable to collect cannot enable these flows. Normal read-only merchant proof is cached for at most 60 seconds per key/account pair; destructive execution forces fresh readiness checks. Every configured price is checked for exact GBP amount, monthly interval, quantity and live/test mode.

The confirmed commission is Essential 1%, Standard 1%, Premium 0% of the full service price when the appointment takes place. It applies to qualifying service occurrences regardless of cash, card, deposit size or payment method. Future appointments do not accrue on booking creation. Cancelled bookings, explicit no-shows and free-trial service are excluded. Each business's exact verified subscription anniversary instants define its billing periods, with appointment time interpreted in the business timezone. Unbilled fees carry to the next eligible bill; fees already on an unpaid invoice stay separate debt and are never invoiced a second time. The monthly SaaS ledger collects this commission alongside the flat subscription. Stripe processing fees are separate. The customer-payment backend handles customer deposits/refunds only, with no new Connect application fee.

The separate migration `20261101013754_jovabook_monthly_commission.sql` and `lib/jovabook-monthly-commission.mjs` implement this ledger, frozen per-occurrence prices and historical tiers, one invoice allocation per renewal, verified invoice-paid settlement and cancellation credit notes. Owner statement refresh is strictly read-only. Variable billing requires the current canonical terms version to be reviewed and captured on the actual billing action. All monthly recognition, invoicing and collection gates default off. The daily worker and production provider flow still require deployment/readiness verification before activation.

Initial subscriptions use Stripe hosted Checkout. Existing unpaid subscriptions use their verified hosted invoice instead of creating another subscription. Hosted actions remain fenced while payment is unresolved. Repeated clicks reuse an existing verified open Checkout. Unknown outcomes retain their action, stable Stripe idempotency key and tenant binding. Requests older than 23 hours are held for reconciliation rather than risking reuse beyond Stripe's idempotency retention window.

Upgrades use a dedicated `subscription_update_confirm` portal flow for the exact server-selected item/price. It does not open generic portal navigation. The explicit portal configuration must be active and use `always_invoice` proration. No target plan is granted until a canonical paid invoice supports it.

Downgrades count all roster records, including inactive staff. The owner must reduce the roster first; the existing guard protects future-booked staff from deletion. A private pending cap is reserved under the same advisory lock as staff writes, then a SubscriptionSchedule changes price at the existing period end without proration. A provider timeout retains the restrictive cap. Cancellation releases it only after verified schedule release. Once the lower plan has been paid, its permanent paid-plan cap replaces the temporary hold. Unexpected provider-side lower plans with excess staff lock access for reconciliation while preserving every staff member and booking.

Webhook signatures are verified against the unmodified bounded request body with the Stripe SDK. Event IDs are private and idempotent. Fresh canonical subscription, invoice and approved-price reads determine state; event order and browser metadata do not. A database fence rejects an older in-flight synchronization after a newer synchronization starts. Unknown price, multiple subscription or provider state fails closed.

## Deletion sequence and protections

Deletion requires all environment and private SQL enablement flags, a configured working billing provider and a server Storage cleanup credential. Dry run remains separate. No production schedule is installed by this change.

1. Produce an exact candidate report containing business/owner UUIDs, reason, deadline, configuration flags and whether customer financial recovery blocks deletion. It contains no client names or emails.
2. Reconcile the canonical provider state. Expire this business's own open Checkout before closing its action. Unknown hosted actions require reconciliation and block deletion.
3. Claim a database lease only while the account is still overdue, unpaid, provider-ready and without unfinished subscription actions, customer refunds or customer card-setup actions.
4. Close only the dedicated verified provider objects: release the matching schedule, cancel subscriptions without an immediate invoice or proration, cancel cancellable incomplete PaymentIntents, remove verified pending invoice items, and void unpaid open invoices. Processing/capture/unknown payments, unrelated objects, unverified ownership or unbounded pagination stop the worker. There are no automatic refunds here.
5. Read provider state again after charge sources are closed. A payment that has settled restores access instead of deleting the account.
6. Under the same private billing row/advisory lock, verify the current deadline, fresh provider-closed proof and exact lease again. Lock Auth before checking shared references. Pending customer refund or card-setup state is checked again immediately before cascade.
7. Preserve Auth if another business or external customer membership needs that user, and delete only the exact unpaid salon. Otherwise delete that exact Auth UUID, letting the existing salon/child FKs cascade. Unknown managed Storage Auth ownership constraints stop the transaction for review. No recursive or broad user deletion is used.
8. Record an immutable manifest containing only `jovabook-website-images/<salonUUID>/<UUID>.(jpg|png|webp)`. Storage SQL metadata/bytes are never changed. After the transaction commits, remove only those exact paths through the Storage API and mark the manifest cleaned. A cleanup failure leaves a retryable manifest. Other tenants' assets are excluded.

The website-image INSERT policy locks the same billing row/advisory key before allowing an active owner's upload, preventing a new image from committing after final manifest collection. It is a read-only Storage predicate and does not change managed Storage rows. Existing public marketing image URLs remain public.

An error before deletion releases the matching lease so the owner can still reach payment recovery. Fresh canonical checks are required on another attempt. An unknown hosted financial outcome remains blocked, with no invented expiry/grace period and no blind new action. Outstanding customer refund states `requested`, `sending`, `pending`, `failed`, `needs_attention`, unknown non-succeeded states, or customer payment actions without verified `completed_at` block deletion. Unknown commission invoice/payment writes and unfinished cancellation credits also block deletion. A managed FK error rolls back the whole account operation and leaves images untouched.

## Disabled configuration and read-only readiness

The migration was generated with the Supabase CLI as `20261101003559_jovabook_billing_access.sql`. It creates private configuration with `enabled=false`, `provider_configured=false`, `deletion_enabled=false`, unset worker hashes and no provider price IDs. It is not applied to production by the source tests.

Separate server-only environment names, never browser variables:

```text
JOVABOOK_BILLING_ENABLED=false
JOVABOOK_BILLING_APPROVED=false
JOVABOOK_STRIPE_MODE=test
JOVABOOK_STRIPE_ACCOUNT_ID=<expected merchant account ID>
JOVABOOK_STRIPE_SECRET_KEY=<dedicated JovaBook key>
JOVABOOK_STRIPE_WEBHOOK_SECRET=<dedicated signed webhook secret>
JOVABOOK_STRIPE_PRICE_ESSENTIAL=<approved GBP20 monthly price ID>
JOVABOOK_STRIPE_PRICE_STANDARD=<approved GBP50 monthly price ID>
JOVABOOK_STRIPE_PRICE_PREMIUM=<approved GBP100 monthly price ID>
JOVABOOK_STRIPE_UPGRADE_PORTAL_CONFIG=<dedicated confirmation configuration>
JOVABOOK_SUPABASE_URL=<exact configured project HTTPS origin>
JOVABOOK_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
JOVABOOK_BILLING_WORKER_TOKEN=<independent random 64 lowercase hex>
JOVABOOK_LIFECYCLE_ENABLED=false
JOVABOOK_LIFECYCLE_AUTH_TOKEN=<independent random 64 lowercase hex>
JOVABOOK_LIFECYCLE_WORKER_TOKEN=<independent random 64 lowercase hex>
JOVABOOK_SUPABASE_SERVICE_ROLE_KEY=<server-only Storage cleanup credential>
```

Private hash installation must retain disabled flags. Bind actual secrets as SQL parameters, never paste them into logs:

```sql
update jovabook_private.billing_config
set enabled=false, provider_configured=false, deletion_enabled=false,
    worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),
    lifecycle_hash=encode(sha256(convert_to($2,'UTF8')),'hex')
where singleton;

-- Read-only, no secret values:
select enabled,provider_configured,deletion_enabled,
       worker_hash is not null as billing_worker_present,
       lifecycle_hash is not null as lifecycle_worker_present
from jovabook_private.billing_config where singleton;
select count(*) as businesses,
       count(*) filter(where deletion_state is not null) as leased
from jovabook_private.billing_accounts;
select status,count(*) from jovabook_private.billing_actions group by status;
select count(*) filter(where not assets_cleaned) as pending_asset_cleanup
from jovabook_private.billing_purge_audit;
select count(*) as original_create_booking_signatures
from pg_proc where pronamespace='public'::regnamespace and proname='create_booking';
select policyname,cmd from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname='billing website image insert boundary';
```

Before enabling collection, verify the correct JovaMedia Stripe account, approved live catalog, dedicated portal configuration, webhook registration/retry delivery and hosted browser flow in an isolated Stripe test environment. Destructive retention needs a separate reviewed activation and verified read-only candidate report. Do not enable it merely because the migration applied. Retired agency checkout routes and credentials are untouched.

## Verification and remaining coverage limits

Run the isolated suites:

```text
node --test booking-demo/tests/billing-backend.mjs booking-demo/tests/billing-lifecycle-sql.mjs
```

They execute the actual PostgreSQL migration using PGlite and mocked Auth/Stripe transport. Coverage includes exact trial/retention clocks, private/public RLS, cross-tenant uploads despite a broad permissive policy, stale provider synchronization, inactive-inclusive caps, canonical paid restore, raw Stripe signatures, duplicate/out-of-order events, hosted action idempotency/timeout holds, downgrade phases, refund/setup retention guards, provider processing-payment blocks, disabled deletion, shared Auth preservation, exact cascade, future Storage ownership constraints and same-email re-registration.

These are not live Stripe round trips, real Supabase JWT/Storage uploads, multi-connection Postgres load tests or production deletion tests. PGlite validates actual SQL behavior but does not establish the interleaving of independent hosted database connections. Provider pagination/mode and external object-state variations still require staging verification. An unresolved portal session or unknown financial action is intentionally quarantined until its outcome is known. No live credentials, credit purchases, test customers or cards are needed to run these source tests.

Current official references used for the implementation:

- [Stripe webhook raw-body/signature guidance](https://docs.stripe.com/webhooks)
- [Hosted portal confirmation flows](https://docs.stripe.com/customer-management/portal-deep-links)
- [Subscription schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules)
- [Pending subscription updates](https://docs.stripe.com/billing/subscriptions/pending-updates)
- [Subscription cancellation and outstanding invoices](https://docs.stripe.com/api/subscriptions/cancel)
- [Invoice payment state](https://docs.stripe.com/api/invoice-payment/list)
- [Supabase Auth deletion and user data](https://supabase.com/docs/guides/auth/managing-user-data)
- [Storage ownership](https://supabase.com/docs/guides/storage/security/ownership)
- [Storage metadata is read-only; use its API](https://supabase.com/docs/guides/storage/schema/design)

## Annual billing revision

The separately reviewed [annual billing extension](ANNUAL-BILLING.md) adds a `cadence` request field and protected access metadata, 20% discounted yearly subscriptions paid upfront, and independent monthly appointment commission. Any cadence change is scheduled at the current paid renewal. The extension requires six fixed server allowlisted prices, annual-specific terms and additional disabled-by-default collection gates. It does not create live prices or enable charges by deployment alone. See that document for exact API, migration, statement, permissions and activation contracts.
