# JovaBook deposit release

Updated 2 November 2026. Subscription billing and salon deposits are separate systems. Live deposits remain disabled while Stripe blocks the platform's live OAuth client ID.

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
- The production build passed after the Stripe compatibility fixes. A later copy-only clarification above the film has no functional code changes.
- An actual hosted Stripe sandbox Checkout collected a GBP10 deposit on the fictional merchant account. The production deposit handler and canonical local SQL confirmed one booking. Canonical cancellation and the production customer refund worker returned a succeeded GBP10 refund, recorded with provider refund ID re_3UXHgwIalrNK0pQu1QK6vj86.
- Actual sandbox proof uses an ephemeral local PGlite database and fictional data, not live customer records. It proves hosted payment, application reconciliation, cancellation and refund. It does not prove live OAuth or a delivered production webhook.
- Test merchant details were completed under explicit approval. Temporary Write Accounts permission was restored to Read after the repair.
- Three live schema migrations applied: hosted deposits, inactive payment scheduler, and deposit attention handling.
- Production deposit and Connect keys, webhook signing secret and separate HTTP worker token are Vercel Secrets. Vault stores the scheduler token. Values never belong in Git or this document.
- Post-migration live SQL confirmed payments off, scheduler off, cron inactive, separate bound worker secrets, no direct anon/authenticated table SELECT and no anon execution of the private predecessor worker.
- Security advisors retain expected warnings for intentionally token-gated public worker RPCs and private deny-by-default tables. The existing pg_net-in-public warning remains. Do not describe the advisor report as clean.

## Remaining activation work

1. Stripe must release the live Connect OAuth client ID. Identity and integration review show complete, but the OAuth setting remains disabled. Irvin received the requested checklist screenshot and escalated to the specialist team by email. Case sco_VYOkDuFtMvI1jJ remains open. The specialists still need to confirm which remaining checklist tasks apply; do not claim this resolved.
2. Save the released live client ID, enable the intended salon sign-in flow, deploy and verify it with a salon-owned account.
3. Verify delivered signed webhook processing and authenticated worker invocation on the deployed routes. Then activate matching server/database gates and cron. Do not enable only one layer.
4. Verify live booking/payment page rendering and Essential subscription checkout after deployment, without an assistant-made real charge.
5. Finalize PR/merge/deployment evidence and free search-engine submissions for the changed marketing page.

The full 1:42 product film is retained. Its text-reminder and slot-recovery previews are described as features being prepared for team plans; they are not advertised as operational Essential features.
