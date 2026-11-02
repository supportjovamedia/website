# JovaBook live QA queue

Updated 2 November 2026. New requests append to this queue. A code change is not marked complete until its interaction checks pass and its release is verified.

## Current batch

- [x] Hero trial CTA lands on plans on desktop and mobile, including while images initialise.
- [x] Branded confirmation and recovery emails, saved to hosted Auth and visually checked.
- [x] Business signup: verified email, carried-over business details, no ambiguous repeated creation prompt.
- [x] Setup waits for persistence; delayed and failed saves cannot show false completion or a spurious error.
- [x] Short trial summary, expandable billing detail, direct workspace entry, clear Stripe card entry path.
- [x] QX Store live trial and public website personalised and checked. No real charge or customer messages.
- [x] Concise subscription commission summary: Essential/Standard 1%, Premium 0%, appointment-date recognition, billing and invoices.

Initial batch shipped in PR #114, merge ed88e87. Marketing and booking production deployments verified. QX website text was saved; photo upload still needs its own check.

## Next batch, access separation and fresh businesses

- [x] New businesses start with an owner and no sample categories/services/clients/bookings. Demo fixtures remain in demo only.
- [ ] Reproduce navigation freeze after editing, including unsaved-change confirmations and sidebar focus.
- [ ] Customer and business login separation enforced by server-owned roles, including existing identities, tenant boundaries and recovery flows. Never trust editable user metadata for roles.
- [ ] Booking clearly offers guest booking or customer account, preserving the selected business.
- [ ] Day/week slot clicks open new booking at selected date/time; month click opens day and contextual action offers booking. Keyboard and touch alternatives remain available.
- [ ] Review cleaner business URLs and wildcard routing. Preserve existing links, tenant isolation, email callback URLs and canonical URLs.

Current operator identity: support.jovamedia@gmail.com. Access remains denied until this email is registered and verified.

## Back office

- [ ] Restricted JovaMedia operator access tied to explicitly authorised identity, not a public signup role.
- [ ] Business directory, subscription/trial status, plan counts, signup dates/history, owner sign-ins today, private read/unread notifications, support notes and recorded support actions.
- [ ] Owners retain subscription cancellation in their own workspace. Support cancellation requires explicit confirmation and an audit entry. No card, bank, provider-secret or customer-password exposure.
- [ ] Verify cross-role, cross-business, logged-out and revoked-access cases before release. Do not claim GDPR compliance from a visual audit.

## Earlier remaining payment work

- [ ] Read-only deployed deposit/refund readiness verification, followed by approved staged activation. Current payment gates remain off.
- [ ] Real salon-owned Stripe connection. Sandbox deposit/cancellation/refund passed; live money flow has not.
- [ ] SMS trial credits and operational activation remain separate from Essential signup.

## Release

- [ ] Feature branch and PR, focused tests and production build.
- [ ] Merge authorised by standing user instruction, verify marketing and booking deployments.
- [ ] Keep Gmail, YouTube and necessary verification tabs; close obsolete test/research tabs.
