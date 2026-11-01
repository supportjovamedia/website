# Annual subscriptions and monthly appointment commission

This extension is prepared on `codex/jovabook-annual-billing`, separately from the Insights and website release. It has not created live prices, changed provider settings or secrets, applied a hosted migration, sent an invoice or charged a card. The user has authorized the feature-branch merge workflow. Production activation remains disabled until its provider and database setup is verified.

## Approved prices

| Plan | Monthly subscription | Annual subscription, paid upfront | Monthly equivalent | Staff | Appointment commission |
| --- | --- | --- | --- | --- | --- |
| Essential | GBP20 | GBP192 | GBP16 | 1 | 1% |
| Standard | GBP50 | GBP480 | GBP40 | 5 | 1% |
| Premium | GBP100 | GBP960 | GBP80 | 10 | 0% |

The annual subscription costs 20% less than twelve monthly subscription fees. Commission receives no annual discount and continues monthly. Existing full-service-price, appointment-date, cancellation, no-show, trial and historical-plan rules remain in place. Service value and customer deposits do not determine whether subscription payment succeeded.

## Owner API and review contract

Checkout and change retain their existing endpoints and add `cadence`:

```json
{"salon_id":"expected business UUID","plan":"standard","cadence":"annual","request_id":"stable action UUID","terms_version":"2026-11-01-annual-monthly-v2"}
```

The accepted cadence values are `monthly` and `annual`. An omitted cadence remains monthly. Browser-supplied amounts, price IDs, customer IDs and entitlements are rejected. Cadence is included in the server action hash and receipt. Reusing an action UUID with another plan, cadence or terms version is refused.

Verified status exposes `billing.cadence`, `pending_cadence`, `subscription_period_start`, `subscription_period_end` and `annual_supported`. The last value is true only when the migration, merchant, six actual fixed provider prices, independent commission worker, both annual collection switches and operational commission supervisor readiness are verified. Otherwise annual live actions are unavailable. A manual plan-change request cannot represent a cadence change.

For monthly review, use `billing.commission_terms_version`. For annual review, use `billing.annual_commission_terms_version`, which is null when annual billing is unavailable. Do not substitute the monthly version. The annual receipt freezes the exact upfront fee, 20% discount, rate, service-price basis and independent monthly anniversary cycle before opening Stripe. Hosted Checkout also displays these terms. No return URL or pending request grants a paid entitlement.

Same-cadence upgrades use the existing exact-item hosted confirmation with approved proration. Every cadence change, including a plan upgrade combined with a cadence change, starts at the current paid renewal. Downgrades also start at renewal. A paid annual owner switching to monthly keeps the current plan until the paid year ends. This flow does not promise an early refund or invent a prorated annual credit.

A scheduled response is `{ok:true,kind:'scheduled',plan,cadence,change,effective_at}`, with `change` equal to `billing_frequency` or `downgrade`. Pending state must show both target plan and cadence. Cancel-change releases only the verified schedule and cap. Subscription cancellation still uses `cancel_at_period_end`, retaining access to the verified year end for an annual owner. Roster limits count inactive members too. No scheduling flow removes staff or bookings.

## Independent monthly commission

Annual subscription invoice lines cover the paid year and supply verified historical tier intervals. Monthly commission anniversaries use the verified Stripe UTC anchor day and time, with calendar-month arithmetic. January 31 clamps to February 28 or 29 and returns to March 31. They are not 30-day periods. Appointment instants are still interpreted in the business timezone; labels do not move a cutoff.

At each elapsed anniversary, the trusted worker reserves actual unbilled service fees before that cutoff. A missed cycle carries those fees to the next verified collection. Already-invoiced unpaid fees stay on their existing invoice and never enter another batch. Premium with no carried fees creates no empty monthly invoice. At a cancelled annual year end, the final occurred-service month may be settled under the separately reviewed monthly commission terms, with no new subscription fee.

Annual commission uses a dedicated customer/subscription-bound automatic invoice with `auto_advance:false`, pending invoice items excluded and a customer-bound saved card verified through PaymentMethods. It includes only the exact commission line. All other manual invoices remain outside automatic collection. The existing matched-line, amount-due, credits, canonical payments, balance, mode, merchant and no-extra-tax/discount checks remain required. Stripe documents that a manually created subscription-linked invoice does not move the subscription's regular billing cycle. [Create an invoice](https://docs.stripe.com/api/invoices/create).

A private cycle UUID is saved before invoice creation. Lost responses are reconciled by the exact customer, subscription, cycle and cutoff metadata before a retry. Old unresolved cycles are handled before a newer cycle; unknown requests older than 23 hours require reconciliation. An unresolved cycle blocks account deletion and makes the statement unavailable. One worker may initiate each finalization/payment stage; after an unknown response, another worker reads the provider outcome rather than submitting another monetary request. Pending, failed or action-required payment is not collection. Existing hosted invoice recovery remains available.

## Statement fields

`billing.commission_summary` retains its existing integer-pence fields and adds:

```text
cadence = monthly | annual
commission_cadence = monthly
period_start, period_end = commission cycle
subscription_due_at = subscription renewal
subscription_next_cadence = monthly | annual
```

For annual periods before renewal, `subscription_amount_pence` is 0. At a verified annual renewal estimate it is the full upcoming annual fee, never the monthly equivalent. A scheduled cadence/plan change supplies that renewal's target fee. Cancellation or an ended paid period has no estimated new subscription fee. Unpaid invoices stay separately reported. The current prepaid annual price belongs in the current-subscription UI, not repeatedly in every month's estimated bill. Status reads saved summaries only; it never accrues or collects fees.

## Deployment and activation

Apply CLI-created `supabase/migrations/20261101051423_jovabook_annual_billing.sql` after the existing owner, billing and monthly-commission foundations. It adds private cadence and cycle metadata, copies the audited monthly workers into private implementations and preserves existing public function identities behind compatible wrappers, and defaults `commission_config.annual_invoice_enabled` to false. It preserves existing tables, plans, history, provider IDs and activation flags.

The server needs six distinct approved price identifiers. Keep the existing monthly keys and add `JOVABOOK_STRIPE_PRICE_ESSENTIAL_ANNUAL`, `JOVABOOK_STRIPE_PRICE_STANDARD_ANNUAL` and `JOVABOOK_STRIPE_PRICE_PREMIUM_ANNUAL`. They must be active GBP year-interval prices with interval count 1 and exact amounts 19200, 48000 and 96000 pence in the configured live/test mode. Missing or duplicate annual identifiers disable annual actions. The existing monthly path continues to require only its three valid distinct monthly prices. No identifiers are created by this source.

In addition to existing billing/commission switches, annual invoices require `JOVABOOK_ANNUAL_COMMISSION_INVOICING_ENABLED=true` and private `commission_config.annual_invoice_enabled=true`. Both remain off until setup is verified. Annual sales also require the deployed supervisor, matching independent HTTP token, supervisor environment/SQL switches and private `supervisor_operational_ready` attestation after the active schedule is verified. The separate [commission supervisor](COMMISSION-SUPERVISOR.md) now supplies due-business enumeration, durable leases and bounded retries. Its source migration creates one inactive named cron job when Cron is available. It supports both accepted terms versions and includes annual accounts through final paid-period settlement. No hosted scheduler has been installed or activated by this source work.

The provider key additionally needs PaymentMethods read and Invoices create, plus existing invoice finalize/pay, credit-note, balance, price, customer and subscription permissions. Use the same verified merchant as subscription billing. No second provider or direct card-charge path is introduced.

Before activation, review the diff, run the isolated monthly and annual suites, rehearse the migration inside a hosted rollback transaction, verify production permissions read-only, and complete an approved test-mode subscription/commission lifecycle. There is no claim of live payment verification in the source tests.

## Local verification

```text
node --test booking-demo/tests/annual-billing.mjs booking-demo/tests/annual-billing-backend.mjs
node --test booking-demo/tests/billing-backend.mjs booking-demo/tests/monthly-commission-backend.mjs booking-demo/tests/monthly-commission-sql.mjs
```

The backend suite executes the actual migrations in PGlite and injects a fictional Stripe transport. It checks exact annual prices, month-end/leap/DST boundaries, paid-state preservation, cadence scheduling, roster guards, default-card ownership, no empty Premium invoices, unknown outcomes and concurrent collection. It never contacts a hosted database or a real provider.
