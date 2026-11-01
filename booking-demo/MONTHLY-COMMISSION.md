# Appointment commission and monthly statements

This source uses the user's final model: Essential 1%, Standard 1%, Premium 0% of each full service price when the appointment takes place. It does not apply a Connect application fee to a customer's card payment. SaaS base prices remain GBP20/50/100 monthly. Stripe processing fees are separate.

Recognition and collection are disabled by default. All tests use fictional data in PGlite plus injected Stripe transport. This work has not made a live invoice-item, finalization, payment, credit-note or refund request.

## Rules and boundaries

- The business's exact verified Stripe period start/end instants define its anniversary cycle, end exclusive. Appointment time uses the business timezone. UI date labels do not change the internal cutoff.
- Future bookings do not accrue when created. A booking five months ahead contributes nothing now. Owner manual scheduling remains available.
- Confirmed/completed service occurrences qualify when their appointment instant passes inside a verified paid plan-history interval. Explicit cancellations and no-shows are excluded. No-show customer deposits are unchanged.
- Appointments during the free trial are waived, without retrospective collection after subscription payment. A future appointment booked during trial can accrue once it actually occurs in a verified paid period.
- Rates come from historical approved subscription invoice-line periods. Paid upgrades begin no earlier than their actual payment time; renewing periods retain their verified anniversary start. Worker retry time and browser-selected plan do not determine historical commission.
- Full price is captured in private append-only financial snapshots, without customer names, email, phone or treatment notes. Later service-price edits cannot rewrite an occurred occurrence's full-price snapshot.
- Occurrence identity includes booking ID and appointment instant. A reschedule voids an unbilled old occurrence or produces one linked credit for its invoiced fee. The new future occurrence is recognized only when its new appointment happens, at that occurrence's historical rate and price.
- Money uses integer minor units and half-up rounding per service. For a GBP50 service at 1%, the commission is 50p.

## Financial state

The migration is CLI-generated `20261101013754_jovabook_monthly_commission.sql`.

Private tables record booking events, verified tier intervals, service/credit entries, frozen invoice batches, invoice allocations, credit-note actions and daily summary snapshots. Browser roles receive no direct table access. Only the independent server worker token may call `booking_commission_worker`.

An invoice item is an allocation, not a payment. Its successful creation never marks commission collected. An allocated unpaid fee is separately reported debt, and is not copied to another payable invoice. Voided invoices release genuinely uncollected fees to carry. An invoice-paid transition requires canonical provider state and the matching frozen commission line. A newer paid invoice cannot hide an older unpaid invoice: core entitlement reconciliation checks outstanding renewal invoices, and recovery chooses the oldest owed hosted invoice.

Every batch freezes entry IDs, aggregate amount and a digest. The provider idempotency key uses the immutable batch UUID. One active batch is permitted for an invoice period. Duplicate webhooks reuse it. If the provider accepted an item but its response was lost, the worker first finds the exact line using its private batch metadata. Unknown requests older than 23 hours are held for reconciliation instead of using a fresh financial key.

The worker may promptly finalize and collect only a verified automatic subscription renewal. It checks the exact bound customer/subscription, approved GBP base-price line, anniversary cutoff, commission line, line count, final totals and actual amount due. Unexpected positive customer debit balances are held, so an account-balance debit cannot silently enlarge the reviewed charge. Manual, foreign, tax/discount-altered or otherwise unknown invoices are held for review. It never calls a raw card charge. Zero-usage renewals use a zero-entry batch and collect only the approved base without inserting a meaningless zero commission line.

Finalization and payment each have a durable first-attempt timestamp and stable idempotency key. An unknown response is read back before another attempt. Canonical processing/capture/succeeded PaymentIntents prevent a new payment call. Failed or action-required payments use the existing hosted recovery flow. A provider `paid` label alone is insufficient: actual invoice-payment allocations and succeeded customer-bound PaymentIntents, or exact applied customer-balance transactions, must cover the amount after verified own credits. A credit-note-only or out-of-band label without that proof is quarantined. Genuine account-balance settlement is recorded with an explicit balance classification even when its new card-payment amount is zero.

Normal renewal can still briefly be gated until payment is verified. No invented unpaid-access grace interval is introduced, and uninterrupted production timing is not claimed without staging verification.

## Cancellations, no-shows and reschedules

An unbilled excluded occurrence is voided. For an already-finalized commission, the worker issues one exact credit note against its original aggregate commission line. An unpaid invoice is reduced; an already-paid fee receives a Stripe customer-balance credit for a later bill. It does not issue a cash refund or a customer-deposit refund. Unknown credit-note responses are reconciled by the occurrence entry metadata and stable key, without creating another note.

Partial or externally modified financial states require review. Credit-note amount, invoice/customer, original line, currency, mode, metadata, and pre/post-payment allocation are verified before recording the credit as settled. Issued note IDs are revisited; a later void is quarantined and blocks deletion, without blindly issuing a replacement credit. Unknown historical-tier occurrences also block deletion and retain an aggregate unresolved count/full-price amount if an administrator explicitly cascades outside the normal worker. The next estimate deducts only an actual provider-confirmed balance credit.

For an ended subscription with no future renewal, an unbilled amount remains recorded as carry; this worker does not create an unrelated ad-hoc debit. Any final off-cycle collection policy needs an explicit supported flow. The existing unpaid-account retention policy records minimal aggregate write-off evidence before its reviewed exact-tenant cascade.

## Owner review and read-only statement

The canonical terms version is `2026-11-01-appointment-v1`. When monthly commission is enabled, checkout/change requests must include the version shown in verified status metadata after the visible plan/rate review. The action hash includes that version. A private action receipt freezes base price, rate, full-service-price basis, appointment recognition, subscription-period cycle and free-trial/cancel/no-show exclusions before a provider write. An existing action cannot silently acquire different fee rules.

`POST /api/jovabook/billing/status` exposes `billing.commission_terms_version` and a nested `billing.commission_summary`:

```text
available
currency = gbp
period_start, period_end
subscription_amount_pence
new_commission_pence
carry_forward_pence
customer_credit_pence
estimated_total_pence
unpaid_invoiced_pence
updated_at, next_refresh_at
```

The estimate is `max(0, subscription + new commission + unbilled carry - verified account credit)`. Already-invoiced unpaid commission is displayed separately, never added a second time. Missing history, unfinished financial reconciliation or stale daily data returns unavailable rather than invented zero amounts. Owner refresh only reads the saved statement. It does not recognize bookings, reserve an invoice, create an item, take payment or issue credit.

## Disabled setup and worker contract

In addition to the dedicated billing configuration documented in `SUBSCRIPTION-BILLING.md`, the server uses:

```text
JOVABOOK_MONTHLY_COMMISSION_ENABLED=false
JOVABOOK_MONTHLY_COMMISSION_INVOICING_ENABLED=false
JOVABOOK_COMMISSION_WORKER_TOKEN=<independent 64 lowercase hex>
JOVABOOK_COMMISSION_HTTP_TOKEN=<different independent 64 lowercase hex>
```

Private SQL configuration defaults `enabled=false`, `invoice_enabled=false`, with no activation date or worker hash. Activation requires the correct expected JovaMedia merchant, approved catalog, genuine per-business terms receipt, corresponding SQL flags and a reviewed activation timestamp. The timestamp prevents a silent billable backfill. Source deployment does not install or enable a production financial job.

The guarded server endpoint is POST `/api/jovabook/billing/commission-worker`, bearer `JOVABOOK_COMMISSION_HTTP_TOKEN`, body `{salon:<exact UUID>}`. A trusted renewal hook may supply `{invoice:<verified invoice ID>}`. The worker validates that provider invoice before attaching anything. A daily trusted scheduler must enumerate eligible businesses server-side and invoke the per-business refresh; it is not a browser action. The signed billing webhook integrates invoice-created/finalized/paid/failed/voided, credit-note and subscription changes. Registration must include those event types before production use.

**Daily activation remains uninstalled.** The supported scheduled entrypoint is now the [commission supervisor](COMMISSION-SUPERVISOR.md). Its core migration creates a network-free private due queue and fixed per-tick route. A separate managed scheduler migration, omitted from the strict offline manifest, creates one named inactive cron job when Cron is available. It discovers one eligible business without a supplied salon UUID, refreshes the actual provider-backed statement and monthly fees, and records durable success or retry. Do not install the earlier manual per-business enumeration template. Provider, SQL, HTTP-secret, environment and cron gates all need verified setup before activation. No live job, Vault secret or HTTP request was created by this source work.

Required restricted-key capabilities for these concrete source calls:

| Provider resource | Capability |
| --- | --- |
| Current merchant account | Read |
| Prices | Read |
| Customers/account balance and balance transactions | Read |
| Subscriptions and schedules | Read, plus existing reviewed billing writes |
| Invoices/line items | Read, finalize/pay write |
| Invoice items | Read/write |
| Invoice payments and PaymentIntents | Read for canonical reconciliation |
| Credit notes | Read/write for exact cancellation credits |
| Billing portal/Checkout | Existing reviewed subscription configuration |

Credit Notes read/write was an additional requirement beyond the initial restricted billing key. The parent agent reports that the approved existing key now includes it. Real SDK readiness and balance-transaction permissions still need read-only verification. These are permission/setup facts, not evidence of an actual production charge.

Read-only SQL readiness, with no secret values:

```sql
select enabled,invoice_enabled,enabled_at,
       worker_hash is not null as worker_present
from jovabook_private.commission_config;
select status,collection_state,count(*)
from jovabook_private.commission_batches group by status,collection_state;
select kind,status,count(*) from jovabook_private.commission_entries group by kind,status;
select status,count(*) from jovabook_private.commission_credit_actions group by status;
```

## Verification

```text
node --test booking-demo/tests/monthly-commission-sql.mjs booking-demo/tests/monthly-commission-backend.mjs
node --test booking-demo/tests/billing-backend.mjs booking-demo/tests/billing-lifecycle-sql.mjs
```

The suites execute actual migration SQL and injected Stripe transport. They cover historical tiers, service price snapshots, future/trial/cancel/no-show exclusions, rescheduling, read-only summaries, carry without duplicate allocation, invoice-paid settlement, zero-usage base renewal, wrong merchant/catalog/customer/lines, required terms receipt, and unknown item/finalization/payment/credit-note outcomes.

No live Stripe round trip, real card, production invoice, customer fixture or real Supabase Storage upload was used. PGlite does not establish the interleaving of multiple hosted database connections. Staging must still verify restricted-key permissions, actual invoice-line response shapes, hosted review, webhook delivery/retry timing, concurrent financial workers and normal renewal access before enabling collection. The existing raw owner-update/advisory-trigger lock-order risk also needs a dedicated owner-write RPC or verified retry handling before claiming concurrency completeness.

Official references: [subscription invoice lifecycle](https://docs.stripe.com/billing/invoices/subscription), [invoice items](https://docs.stripe.com/api/invoiceitems/create), [invoice line periods](https://docs.stripe.com/api/invoice-line-item/object), [credit-note adjustments and customer balance](https://docs.stripe.com/api/credit_notes/create).

Restoring the exact instant of a previously voided or credited occurrence is deliberately held for financial review. The original price and settlement evidence remain immutable; automatic invoicing, the estimate and retention purge are blocked for that business. This release does not automatically create another fee or reverse an already issued credit for a reopened occurrence. An explicit reviewed resolution is required before activation with such records.

## Annual subscription extension

The separate [annual billing extension](ANNUAL-BILLING.md) adds prepaid GBP192/480/960 yearly subscriptions with a 20% subscription discount. Commission stays monthly. After its migration, the scheduler predicate above includes both approved terms versions. Annual commission uses its own verified subscription-linked monthly invoice, including final-month settlement at a cancelled year end. Other manual invoices remain excluded from automatic collection. Annual invoicing requires two additional switches and defaults off. The earlier monthly ended-subscription carry policy remains unchanged for monthly subscriptions. No hosted activation is claimed by this documentation.
