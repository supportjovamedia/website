# Paid signup before business setup

Free keeps the existing email verification and seven-step setup flow. Solo and Team insert one selected-subscription payment review after email or Google verification and before profile/business setup. Homepage pricing, tier selection, prices and annual discounts are unchanged. New paid signups have no trial.

The review shows the server-quoted plan, billing cadence, staff seats and amount due. Team includes one seat, with each additional seat included in the quote and Stripe quantity. Consent and an optional referral code are captured before opening Stripe Checkout. Subscription billing begins when payment is confirmed, with monthly or yearly renewal on that date.

Preparing checkout creates or resumes one private setup business under an owner transaction lock. It remains unbookable before and after payment until the existing setup steps are complete. The existing setup renames that same business. Retry requests retain an identity-scoped idempotency key after ambiguous failures; expired or conflicting checkout actions require a fresh request. Existing accounts and previously granted trials remain supported.

A return URL is navigation only. The shared billing status path retrieves Stripe subscription and invoice evidence, checks merchant, customer, approved price and payment, and reconciles the canonical database state. Setup advances only when the server reports verified payment. Cancellation returns to the same review. There is no interval or focus-driven payment polling; the user can explicitly check payment status.

## Release

Apply only `20261110051528_paid_signup_before_setup.sql` to the intended JovaBook database after review and local checks. It adds a private RLS-protected table and narrow owner-guarded RPC, and wraps existing setup/access RPCs while preserving their prior implementations. It does not bulk-update accounts or subscriptions. Older unrelated unmerged migrations are outside this release.

Publish the reviewed commit to both the main/API and booking Vercel projects. Build the booking application with its existing bundle builder and immutable content-hashed assets. Confirm both production aliases, exact commit and deployed bundle bytes. Preserve authentication storage and existing sessions.

## Validation and limits

Local tests use fictional identities, an offline database and intercepted provider requests. They cover Free and existing accounts, verified email and Google signup, monthly and annual Team seat totals, consent, referral validation, duplicate submissions, cancellation, retry, forged success redirects, canonical payment confirmation, private drafts and completion of the existing setup. Existing owner-session and Google regressions are part of the release gate.

No live card charge, customer signup, email or refund is performed by these tests. A real payment remains a user action; passing mocks does not establish that a live bank authorisation will succeed.
