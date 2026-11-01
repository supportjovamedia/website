# JovaBook customer portal

The customer portal is separate from the business owner's admin account. Customer authentication uses native Supabase Auth and customer-only session storage. It never reads or changes the owner session keys. A verified email is required before customer membership or booking queries. First and last names are 1 to 60 trimmed characters; phone is required and is 7 to 40 trimmed characters. No username is collected.

Public customer links retain `?portal=customer&salon=<slug>` and use `#customer/login`, `register`, `forgot`, `reset`, `bookings` or `payments`. Recovery callbacks are consumed only within that exact customer business context. The host strips token-bearing hashes immediately. The portal verifies the recovery token at `/auth/v1/user` before showing a password form and verifies again before updating the password. Customer recovery credentials are stored separately from normal customer credentials.

Customers see only the bookings returned by the authenticated customer RPC for their verified email and business. The frontend also rejects mismatched business slugs or customer emails. It offers cancellation only when the server returns `can_cancel: true`; the database enforces the 24-hour deadline again. Cancellation requests keep the same UUID across ambiguous network retries. Online rescheduling is unavailable. Deposit and refund labels show backend facts, not inferred successful refunds.

## Server endpoints

All endpoints are POST only, reject unexpected input fields, bound request bodies to 8 KiB, and return `Cache-Control: no-store`. Browser CORS allows the exact booking origin and the JovaMedia site origins, without cookies. The browser is never allowed to choose a provider account, Stripe customer, return URL, refund amount or payment intent.

| Endpoint | Input | Behaviour |
| --- | --- | --- |
| `/api/jovabook/customer/recovery` | `{salon,email}` | Calls the private-token worker for membership eligibility and persistent global/address/network limits. Eligible requests use native Auth recovery with the canonical customer callback. There is no automatic reset request when visiting a page. |
| `/api/jovabook/customer/payment-method` | `{salon,request_id}` plus customer bearer JWT | Verifies the native Auth user and customer booking membership, then uses the private verified business-to-connected-account mapping. Opens Stripe Checkout in `setup` mode only. |
| `/api/jovabook/customer/payment-status` | `{salon}` plus customer bearer JWT | Reads connected-account payment status, verifies complete or expired setup sessions, and returns only safe card brand, last four digits and expiry. Loading this screen never creates a provider object. |
| `/api/jovabook/customer/refund-worker` | `{}` plus separate worker bearer secret | Processes at most one reconciliation and one newly requested refund. Queue leases and immutable server deposit records determine every monetary parameter. |

Recovery returns the same conditional response for a normal eligible address, a nonexistent/nonmember address, a rate-limited request and an Auth provider failure after eligibility is checked. This avoids revealing account existence through response content or status. The Auth request has a 1.5-second timeout, followed by padding to the same 1.8-second response window after the database decision, reducing the eligible-address timing difference. It does not confirm email delivery. Missing configuration or database failure returns an unavailable error before an address-specific send decision can be exposed. Provider delivery health needs separate operational verification. The server trusts the Vercel-provided network header only when running on Vercel, fingerprints it before the private RPC, and otherwise uses the shared unknown-network limit.

## Payment and refund boundaries

Customer payment configuration is independent from JovaMedia's SaaS subscription billing. The server never uses the SaaS billing customer mapping. It verifies that the dedicated key belongs to the configured JovaMedia platform account. New payment setup requires the connected account's card capability, submitted details, charges and payouts to be ready. Existing card/status reconciliation and captured-deposit refunds verify account access and immutable bindings without requiring charges or payouts to remain enabled. The server uses `stripeAccount` on all customer, setup, payment-method, payment-intent and refund SDK requests. Hosted redirects must have the exact `https://checkout.stripe.com/` authority, with no port or credentials. The browser never collects card numbers or CVCs.

This release implements hosted addition/update of a payment method and a safe summary of the verified saved card. It does not implement card removal or a new paid-booking checkout. Checkout `setup` does not charge a booking deposit or commission. A complete Checkout session is insufficient on its own: the server verifies the corresponding SetupIntent is succeeded and its card is attached to the same connected-account customer before recording a safe summary. Expired sessions close the setup action without claiming a card was saved. Unknown sessions are reconciled by immutable action metadata. Browser return query values never establish payment success. The status response includes the public business name and slug from the verified membership response; the frontend checks the slug again before using that heading or showing card details.

Existing customers can still view and cancel eligible existing bookings when the business owner's billing is restricted. Existing card/setup reconciliation remains available; `can_setup: false` disables new payment setup with an explanation. Actual deposits eligible for automatic refunds must already exist in the private server ledger with a captured payment intent. A browser deposit value or demonstration payment is insufficient.

Payment actions persist the customer, business, merchant and request binding before opening setup. Customer IDs are bound privately once. Existing hosted sessions are retrieved and checked before reuse. Unknown setup requests older than 23 hours require reconciliation instead of creating another session after the provider's idempotency window.

Refunds verify the direct connected-account payment intent, GBP amount received, captured charge, business/booking metadata and any existing refunds. Destination charges, partial/mismatched captures and unrelated refunds require attention. A new refund uses the immutable queue UUID as its idempotency key and refunds exactly the recorded deposit amount. A lost response becomes pending. Later runs retrieve a known refund or list refunds by payment intent and match immutable queue metadata. After 23 hours, an unknown request may only be retrieved or reconciled, never blindly issued again. Provider `pending` or `requires_action` never becomes local success. Failed or cancelled provider refunds remain `needs_attention` with a financial hold, and never trigger a blind new refund. Refund completion must retain the matching lease and immutable provider ID. No webhook is needed to claim immediate success; the worker must continue polling pending provider states.

The confirmed commission is 1% of the full service price for each booking on Essential and Standard, and 0% on Premium. It is invoiced monthly in arrears with the subscription. Stripe processing fees are separate. This customer module never collects commission during card setup or deposit checkout. Customer deposit refunds return only the full verified captured deposit. Commission accruals and cancellation credits belong to the separate monthly billing ledger; month attribution is defined by that billing implementation, not customer-controlled values.

## Configuration and readiness

All flags are disabled unless explicitly configured. SQL also has independent disabled-by-default recovery/payment controls and a hashed worker token. These are deployment readiness requirements, not values the browser can enable.

| Server environment | Purpose |
| --- | --- |
| `JOVABOOK_SUPABASE_URL` | Approved HTTPS Supabase origin. No browser-provided URL is accepted. |
| `JOVABOOK_SUPABASE_PUBLISHABLE_KEY` | Public API key for Auth and the token-protected private worker RPC. No service-role key is needed here. |
| `JOVABOOK_CUSTOMER_WORKER_TOKEN` | Dedicated 64-character lower-case hex secret matching the private SQL worker hash. |
| `JOVABOOK_CUSTOMER_RECOVERY_ENABLED=true` | Allows explicit customer recovery after the SQL eligibility/rate checks. Native Auth outbound email and customer callback allowlisting must be configured separately. |
| `JOVABOOK_CUSTOMER_PAYMENTS_ENABLED=true` | Allows payment setup and refund processing only when all other checks pass. |
| `JOVABOOK_CUSTOMER_PAYMENTS_APPROVED=true` | Separate deployment approval flag for connected-business payments. |
| `JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY` | Dedicated configured Stripe server key, separate environment name from SaaS billing. |
| `JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID` | Expected platform account ID. The key is checked using `accounts.retrieveCurrent()` before merchant actions or refund claims. |
| `JOVABOOK_CUSTOMER_STRIPE_MODE=test` or `live` | Must match the secret-key mode and retrieved provider objects. |
| `JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN` | Separate 64-character lower-case hex secret authenticating refund-worker calls. |

Merchant accounts and customer/provider mappings are private SQL records. They cannot be supplied through customer requests. Enablement requires a separately approved merchant setup, verified source-deposit ingestion, worker scheduling, callbacks and operational reconciliation. No credentials, real customers, outbound messages, paid resources or real monetary actions were created during implementation. This document does not claim the hosted payment service is connected or commercially active.

## Local verification

Run from the repository root:

```text
node --test booking-demo/tests/customer-portal.mjs
node booking-demo/tests/customer-portal-browser.mjs
node booking-demo/tests/customer-portal-integration-browser.mjs
node --test tests/jovabook-customer.test.mjs
```

The unit and browser suites inject synthetic native Auth, membership, bookings, recovery and provider responses. The HTTP/SDK suite injects all Supabase and Stripe effects. It covers missing authentication, unverified users, tenant mismatch, CORS, unsupported inputs, disabled configuration, provider capability failures, unsafe redirects, stable setup requests, refund mismatches, pending versus succeeded, lost responses, expired idempotency windows and lease failures. Browser proof includes actual inputs, keyboard navigation and 390-pixel layouts. There are no raw card inputs or new dropdown controls.

These tests do not provision Supabase users, send real verification/recovery emails, create Stripe resources or perform refunds. Local SQL tests and full application integration are maintained by the respective backend and host integration owners.
