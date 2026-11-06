# JovaBook referrals

This release adds owner referral progress, referral codes and links, signup attribution, an operator review ledger and reward access. Apply the migration before deploying either application. No paid sending or live customer billing is activated by the migration.

## Rules

- A new business supplies its referrer's code before business creation. Links prefill that same editable code.
- Attribution is stored atomically with business creation after verified email login. Analytics consent, GA and UTM attribution do not determine eligibility. No referral click-tracking endpoint or analytics identifier is introduced.
- Joining appears immediately in the ledger. A referral is ready for review after its first verified, positive-payment, full monthly Solo or Team billing period ends. Annual, zero-payment, failed and prorated periods cannot supply qualifying evidence.
- An operator checks the real invoice, cycle completion, no refund or dispute, distinct businesses and no self-referral, then approves qualification. Approval creates the newcomer reward and increments referrer progress. Every three qualifying businesses create one referrer reward.
- Free accounts claim one calendar month of Solo without a Stripe subscription or card. Access expires automatically and returns to Free. An existing paid subscription is never created by a reward claim.
- Monthly Solo rewards cover the GBP 20 base. Monthly Team rewards cover the GBP 25 base only. Extra Team seats, top-ups and other charges remain payable. Annual invoices are excluded. Rewards are used one at a time; an already-issued invoice is not refunded.

## Owner workflow

The dashboard has a referral card, a plan-usage panel and a corrected refund empty state. Referrals in the sidebar opens the personal code, link, share actions, joined/qualified totals, progress, rewards and referral table. Code and link copy separately. Sharing opens a draft or native share sheet; it does not send an invitation or increase a fictional invitation count.

The existing owner-access refresh carries referral data, so there is no extra Vercel endpoint, polling loop or asset request. New UI code and styles use existing bundles. This refresh is not a promise of instant websocket delivery. Ordinary account refresh and the explicit Refresh button update the displayed progress.

Signup asks whether the business was referred. A supplied code is validated without disclosing the referrer's details and retained in the existing signup draft and Auth signup metadata. The verified login continuation sends it to the atomic business-creation RPC. The signup copy discloses that the new business's name and referral progress are shown to its referrer. Client records, contact details and payment amounts are never included in the referrer's view.

## Operator workflow

Use Back Office > Referrals. Each action is authorised by the existing operator allowlist and writes an audit event.

1. Open the recorded first paid invoice in Stripe. Check its subscription, actual service dates, settled payment, refunds/disputes and the two distinct businesses. A completed date alone is insufficient.
2. Approve the completed paid cycle, confirming the exact invoice ID and recording a review note. Failed validation leaves the referral unchanged. Repeated approval cannot create a second reward.
3. Free account owners can start their approved Solo reward themselves. Paid rewards remain available for an eligible monthly renewal.
4. In Stripe, use a fixed GBP 20 Solo or GBP 25 Team discount for one invoice. Restrict it to the corresponding subscription product. Never use the superseded 100% Team coupon, because that would also waive seats. Do not create a public promotion code.
5. Apply the discount to the intended regular monthly renewal without proration. Inspect the draft invoice and check that only the base is discounted. For Team with two extra seats, GBP 37 becomes GBP 12. Register that draft invoice ID with **Record discount on draft invoice** before finalisation. If the intended invoice has already been issued, use the following eligible renewal. Do not refund it.
6. After the assigned invoice finalises successfully, verify it and use **Confirm assigned invoice was discounted**. The application accepts an approved zero-total monthly reward invoice as entitlement proof, provided the verified price, subscription, customer, full period and exact base discount match. An arbitrary free invoice cannot grant access or count as a new paid referral.

Stripe coupon duration Once is an invoice discount, not an interval restriction. Monthly-only use is enforced by the operator workflow and application ledger. Product restrictions alone also permit an annual price on the same product, so an annual invoice must never be selected. Do not stack other discounts or rewards on the same invoice.

## Safety and operational limits

Private tables have RLS enabled and no direct client table grants. Public thin SQL wrappers bind private functions at creation time, remain security invoker, and grant only the required roles. Private mutation functions verify the actual owner or operator. Worker evidence uses the existing authenticated, fenced billing reconciliation path.

The referral ledger retains a salted email fingerprint and unique invoice/source references to prevent duplicate rewards after account deletion. Public codes are shareable identifiers, not credentials. Distinct-business fraud, alternate-email self-referrals and later refunds/disputes require operator review. Already-qualified rewards cannot be silently revoked through the reject action; investigate financial corrections separately. No programme launch is represented as legal advice about cookies or consent.

The existing global SMS disabled state is unchanged. A free month changes normal plan entitlement and does not itself authorise any sender purchase, paid top-up or SMS activation.

## Release and validation

1. Review the feature PR and database migration together.
2. Apply `20261106201510_referral_program.sql` to the JovaBook project before either frontend/server deployment. Run the Supabase security advisers and a read-only smoke check after application.
3. Deploy the main website/billing server and booking application from the reviewed commit. Verify a real owner can see its own referral code and that operator access works. Use fictional local fixtures for attribution/payment tests; do not create production test customers or send messages.
4. If rollback is required, roll back the applications first and retain the append-only referral/reward ledger for reconciliation. Do not drop financial history.

Local tests cover owner isolation, atomic attribution, invalid codes, one referral per identity, billing proof, monthly cycle boundaries, duplicate qualification, rewards, Free access expiry, Team base amounts, annual refusal, zero invoices, signup continuation and existing billing/booking guards. Browser proof uses local fictional records and disconnected provider configuration at `/tests/referrals-preview.html`.
