# JovaBook deposit release

Updated 2 November 2026. Subscription billing and salon deposits are separate systems. The production deposit service and automatic refund scheduler are enabled. Each business must connect its own payment-ready Stripe account and choose its deposit percentage.

## Implemented

- One business-wide deposit percentage, 0 to 100 with two decimal places. Zero disables deposits.
- Integer-penny calculation from the saved service price. Deposits below Stripe's 30p minimum stay payable at the booking.
- Direct connected-account charges and refunds. No JovaMedia application fee, transfer or bank change.
- Private availability holds, idempotent Checkout creation, verified captured payments and immutable accepted price snapshots.
- No booking or confirmation email before verified payment. Unfulfillable paid bookings queue a refund.
- Server-enforced cancellation cutoff: at least 24 hours before the booking. No rescheduling or automatic no-show refund.
- Refunded/disputed captures get an owner-visible review state. Only a fully verified completed refund releases an uncertain paid hold.
- Failed delayed payments release holds only after Stripe proves no captured money.
- Tenant-bound owner settings, separate worker credentials and inactive-by-default collection/scheduling gates.
- Updated all JovaBook Checkout creation flows to Stripe's current dynamic-payment-method API. Refund verification accepts the documented Refund object, which has no required livemode field; the API key, connected-account scope and original captured PaymentIntent establish mode and ownership.

## Verified evidence

- 125 focused server/database tests passed, zero failures, including tenant boundaries, percentage rounding, duplicate capture/refund handling, cancellation cutoff and old-schema guard compatibility.
- Twelve desktop/phone browser cases passed across two runs: ten marketing/payment cases and two refunded/attention visual-state cases. These browser fixtures simulate Stripe.
- Fourteen isolated provider/recovery interaction cases passed. The legacy Stripe-key test now checks inactive checkout and absence of deposit controls, rather than obsolete warning wording.
- The full server regression stage passed locally: 599 tests, zero failures. Four legacy website-pricing browser cases passed after selecting Websites explicitly under the new JovaBook-first navigation. Deposit unit/database tests are now included in the continuous regression runner.
- Expanded server stage passed all 625 tests at two-process concurrency. The full desktop/phone browser run passed 65 tests with five live-only checks skipped. The deposit browser fixture now owns its loopback server instead of relying on port 4338; all eight cases passed independently. The preceding CI run passed its 48 Lighthouse visits and budgets; its eight failures were the missing local fixture server, now fixed.
- The production build passed after the Stripe compatibility fixes. A later copy-only clarification above the film has no functional code changes.
- An actual hosted Stripe sandbox Checkout collected a GBP10 deposit on the fictional merchant account. The production deposit handler and canonical local SQL confirmed one booking. Canonical cancellation and the production customer refund worker returned a succeeded GBP10 refund, recorded with provider refund ID re_3UXHgwIalrNK0pQu1QK6vj86.
- Actual sandbox proof uses an ephemeral local PGlite database and fictional data, not live customer records. It proves hosted payment, application reconciliation, cancellation and refund. It does not prove live OAuth or a delivered production webhook.
- Test merchant details were completed under explicit approval. Temporary Write Accounts permission was restored to Read after the repair.
- Three live schema migrations applied: hosted deposits, inactive payment scheduler, and deposit attention handling.
- Production deposit and Connect keys, webhook signing secret and separate HTTP worker token are Vercel Secrets. Vault stores the scheduler token. Values never belong in Git or this document.
- Post-migration live SQL confirmed payments off, scheduler off, cron inactive, separate bound worker secrets, no direct anon/authenticated table SELECT and no anon execution of the private predecessor worker.
- Security advisors retain expected warnings for intentionally token-gated public worker RPCs and private deny-by-default tables. The existing pg_net-in-public warning remains. Do not describe the advisor report as clean.

## Production activation, 2 November 2026

- Stripe approved live Connect. The production client ID is configured. Live salon sign-in reached Stripe's account selection page; cancelling returned correctly to the same owner workspace. No existing merchant account was connected without an owner choice.
- PR #115 merged as `927d5b81fbbbbb7bde7fb5aee8d03020ea324a0d`. Booking UI and full functional/performance CI passed. Both the booking site and marketing/API deployment are live.
- Authenticated production diagnostics verified the correct live Stripe platform, private database worker, separate deposit/refund credentials and webhook signing configuration.
- Production payment flags, private database collection and scheduler gates are enabled. The every-minute scheduler's first observed run at 14:33 UTC succeeded. Both authenticated workers returned HTTP 200 with empty queues.
- A locally signed configuration-only webhook returned HTTP 200. A tampered signature returned HTTP 400. This proves signature handling and matching configuration. It is not a real provider-delivered payment event.
- No real live payment or refund was created, as instructed. The earlier actual sandbox deposit/refund remains the monetary-flow evidence. A salon must complete its own Stripe connection before taking deposits; no live merchant capture or refund is claimed as tested.
- SMS stays disabled by user instruction. SMS Works shows 50 credits and none were used for this release. Automated account deletion stays disabled.

The full 1:42 product film is retained. Its text-reminder and slot-recovery previews are described as features being prepared for team plans; they are not advertised as operational Essential features.
