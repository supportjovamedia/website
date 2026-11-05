# Starter, Pro Solo and Pro Team

Approved offer, 5 November 2026. Supersedes the Essential, Standard and Premium offer.

| Plan | Monthly | Annual, upfront | Calendars | Bookings per calendar month | Monthly emails | Monthly SMS |
| --- | --- | --- | --- | --- | --- | --- |
| Starter | £0 | Free | 1 | 20 | 50 | 0 |
| Pro Solo | £20 | £192 | 1 | Unlimited | 100 | 50 |
| Pro Team | £25 including one seat | £240 including one seat | One per purchased seat | Unlimited | 100 per seat | 50 per seat |
| Extra Pro Team seat | £6 | £57.60 | +1 | Unlimited | +100 | +50 |

Every plan has 0% booking commission. Stripe processing fees are separate.
Starter never asks for a payment card. Paid plans offer a 14-day card-backed trial;
the selected subscription starts automatically after day 14. Cancellation remains
available in the business dashboard. The marketing page does not provide cancellation
instructions. Trial access is granted only after the provider confirms the saved
card, account binding, exact trial duration, approved price and seat count.

Every plan includes a one-page business website on a JovaMedia subdomain and Stripe
deposits. Starter and Pro Solo retain the Powered by JovaBook badge. Pro Solo and
Pro Team include a website embed. Pro Team removes customer-facing branding and
includes advanced Insights, period comparisons and extra one-page customisation.
Multi-page websites are retired from the offer.

Monthly booking limits use appointment dates and exclude cancelled appointments.
Manual and online bookings share the limit. Pending deposit checkouts reserve
capacity before payment. Existing appointments remain editable. Monthly email and
SMS allowances reset on UK calendar months and do not roll over. A message's
reservation is idempotent, including provider retries. Multipart SMS provider
credits are a separate infrastructure budget; an included SMS counts one message.

## Coordinated release

This is a feature-branch change. Do not enable the new public offer while the
production database or payment configuration still implements the retired trial.
The internal keys `essential`, `standard`, `premium` remain stable for historical
records and mean Starter, Pro Solo and Pro Team in the versioned offer.

1. Review and merge the PR only with Abdul's explicit merge approval.
2. Confirm the retired Stripe subscriptions are closed and reconciled. The migration
   refuses an outstanding legacy subscription. Do not charge or silently migrate it.
3. Apply `20261105022405_free_plans.sql` using the normal reviewed migration process.
4. Configure four new GBP recurring prices. Pro Solo is per-unit, quantity one:
   monthly 2000 pence and annual 19200 pence. Pro Team uses licensed graduated tiers:
   first tier up to 1 seat, flat 2500 pence monthly or 24000 annually, unit amount 0;
   second tier unbounded, flat 0, unit amount 600 monthly or 5760 annually.
5. Configure the dedicated hosted plan-change portal for these products and prices,
   with price and quantity updates, `always_invoice` proration, an unchanged billing-cycle anchor, `trial_update_behavior=continue_trial`, and hosted confirmation. Trial changes fail closed unless this preserves the existing free-trial deadline.
6. Set server-only `JOVABOOK_OFFER_VERSION=2026-11-free-v1`,
   `JOVABOOK_STRIPE_PRICE_PRO_SOLO`, `JOVABOOK_STRIPE_PRICE_PRO_SOLO_ANNUAL`,
   `JOVABOOK_STRIPE_PRICE_TEAM`, `JOVABOOK_STRIPE_PRICE_TEAM_ANNUAL` and
   `JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG`. Existing merchant, billing worker and signed
   webhook settings are reused. Secrets must never be committed or printed.
7. Deploy the marketing/API app and booking app together. Retain noindex headers
   for operator and private booking routes. New booking/embed API pages are noindex.
8. Check Starter signup without a card, a paid trial through the approved test-mode
   flow, annual totals, seat quantities, booking caps, messaging counters, the customer
   embed, branding and dashboard cancellation. Do not make a live payment or consume
   SMS credits as part of verification.

Free workspaces do not expire or enter the old trial-deletion scheduler. A paid
trial that expires falls back to Starter. Staff and booking history are retained;
an over-cap staff roster requires review before new private workspace edits.

## Verification

Run the offer billing and PostgreSQL suites, the deposit and email regressions,
responsive pricing and signup/dashboard browser proofs, production build and
function-trace audit. Browser tests must intercept external auth, payments and
message providers. Keep screenshots and reports under `output/free-plans`.

Local proof, 5 November 2026: 803 server/SQL regression checks passed, then all ten current-offer billing cases and 43 changed-module checks passed. The full production website browser suite passed 75 checks (five device-specific skips). The new intercepted browser proof covers three dashboard widths, card-free Starter setup, paid-trial dashboard cancellation, Starter and Team public websites with logos, embed access and the deposit popup return. No live payments or SMS were used. Production build, function trace audit and ESLint passed.

The provider catalogue, portal configuration and production database migration remain deployment prerequisites. The obsolete disposable trial account was deleted separately with explicit approval; no customer account is migrated or charged by this PR.

Back-office account counters, business records, trial notifications and subscription summaries read the versioned offer directly. Starter is counted as free; unpaid trials are separate from active paid Pro plans. Operator reads preserve historical financial records and do not create billing actions.

Stripe reference for retaining the original trial on plan changes: https://docs.stripe.com/customer-management#limitations-to-modifying-subscriptions.

## Merge and production publication

Merging this PR does not activate the offer. The Next production-build entry checks the release version, the applied database migration, the deployed booking-app version, the expected live merchant, all four exact approved prices and the trial-preserving portal configuration. An incomplete setup stops that candidate build before publication, leaving the existing deployment serving the domain. Preview and local builds remain available without production credentials. No Vercel project-wide routing or automatic-domain settings are changed. Configure the prerequisites and deploy the booking app first, then redeploy the main app to publish the offer.

## Update: deposits are paid-plan only, and there is no free trial (5 November 2026)

- Stripe deposits belong to Pro Solo and Pro Team. Starter is booking only. The database returns no deposit for a Starter business, hides the deposit from its public booking page, and refuses to switch deposits on. A downgraded business keeps its saved settings but takes no deposits, and can still switch them off.
- New free trials are retired. Starter never asks for a card. Pro Solo and Pro Team take a card and charge when the owner subscribes. Trials that already started continue to be verified and end as normal.
- Migrations: `20261105110000_deposits_paid_plans.sql` and `20261105113000_no_free_trial.sql`. Apply both, in that order, after `trial_limits`.
