# JovaBook launch backlog

## Commission invoices overdue

Requested 2 November 2026. Backlogged only; do not activate new account restrictions in this release.

- Persist the verified invoice due date and exact provider collection state.
- Agree the payment grace period and reminder schedule before implementation.
- Send a reminder to the business account email, showing the commission amount, billing dates and a secure payment link.
- If the agreed deadline passes, restrict booking and management features while retaining access to Subscription and payment recovery.
- Restore access only after verified settlement. Handle credits, disputed invoices, failed retries and already cancelled subscriptions explicitly.
- Preserve uncollected commission across billing periods without charging it twice.
- Keep operator reminders and manual actions explicit and audited. Do not automatically send messages from the back-office reporting view.

## Repeat-trial prevention

Retain the existing private normalized-email trial marker after business deletion. It stays in Supabase and is excluded from the operator navigation. A browser returning-user marker changes presentation only; the server remains responsible for trial eligibility.

Considering a future provider payment-method fingerprint is a separate feature. Do not store card numbers, CVCs or raw card data for trial prevention.
