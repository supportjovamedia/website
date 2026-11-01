# Local Stripe TEST verification

This opt-in runner keeps Auth, one fictional business and all financial SQL in a fresh in-memory PGlite database. Its only provider destination is `https://api.stripe.com:443/v1/`. It never uses hosted Supabase or deploys anything. Existing production handlers and the strict offline database CLI are unchanged.

No real Stripe lifecycle has been executed merely by adding this runner. Unit tests inject provider doubles. The offline preflight makes no provider requests. A real run needs the separate prerequisites below.

## Start offline

Use Node.js 22 or newer and install the repository's locked dependencies with `npm ci`. Do not run from a production environment or load a production `.env` file.

```powershell
node --test tests/jovabook-stripe-test.test.mjs
node scripts/jovabook-stripe-test.mjs preflight
```

Preflight loads the current strict CLI's SQL source manifest, with only the existing PGlite-compatible SQL preparation. It does not reuse that CLI's fixture records or weaken its no-network guard. Each invocation closes and discards its temporary database.

## Sandbox prerequisites

An account owner must supply an enabled Stripe sandbox. The account must report `charges_enabled: true`. A paused sandbox stops the runner before any fixture creation. Resolve the sandbox's verification tasks through Stripe or select another authorized sandbox. This is not evidence about a live account's status.

Create a **restricted sandbox key**, `rk_test_...`, separately. The runner rejects unrestricted `sk_test_...` keys, all live keys and live mode. Do not put credentials in shell arguments, source control, screenshots or reports. Set process-scoped environment variables securely in a clean local shell:

| Environment variable | Required value |
| --- | --- |
| `JOVABOOK_TEST_STRIPE_KEY` | Restricted sandbox secret |
| `JOVABOOK_TEST_STRIPE_ACCOUNT_ID` | Exact expected sandbox `acct_...` |
| `JOVABOOK_TEST_PRICE_ESSENTIAL` | Active TEST GBP 2000p, monthly, interval count 1 |
| `JOVABOOK_TEST_PRICE_STANDARD` | Active TEST GBP 5000p, monthly, interval count 1 |
| `JOVABOOK_TEST_PRICE_PREMIUM` | Active TEST GBP 10000p, monthly, interval count 1 |

The three price IDs must be distinct and already exist. This runner does not create or alter catalog prices. It pins Stripe API `2026-09-30.endive` using the installed SDK.

Smallest permissions for this runner, subject to Stripe's account-specific restricted-key controls:

| Resource | Permission | Use |
| --- | --- | --- |
| Account | Read | Exact account and chargeable status |
| Prices | Read | Verify all three catalog entries |
| Payment methods | Write, including read | Create `tok_visa` test method, verify attachment, detach cleanup |
| Customers | Write, including read | Create, verify balance and metadata, delete fixture |
| Subscriptions | Write, including read | Create, list, reconcile, schedule cancellation, cancel cleanup |
| Invoices | Write, including read | Verify invoice, read lines, tag its test run metadata |
| Invoice payments | Read | Verify the paid allocation |
| Payment intents | Read | Verify succeeded test payment |

No Checkout, portal configuration, Connect, bank account or payout access is needed for this narrow path. A `403` may mean an account-specific permission is missing; the report preserves the request ID for review and does not expose provider bodies. Do not broaden a key to unrestricted access to bypass a failure. No webhook endpoint or signing secret is required for this runner.

## Read-only catalog check

```powershell
node scripts/jovabook-stripe-test.mjs catalog
```

Only account and price GET requests are permitted. It refuses wrong accounts, paused payments, live prices, incorrect amounts, currencies and intervals. `DATABASE_URL`, `DIRECT_URL`, `PGHOST`, `PGHOSTADDR`, `PGDATABASE`, `SUPABASE_URL` or `JOVABOOK_SUPABASE_URL` must not be present. Hosted runtime indicators are also rejected.

## Explicit TEST mutation

```powershell
node scripts/jovabook-stripe-test.mjs run --confirm=test-only
```

This creates a test card payment method, customer and one monthly Essential subscription in the expected sandbox, using Stripe's `tok_visa` test token. There is no real card or email recipient. The first test invoice must be paid for exactly GBP20 with one verified succeeded PaymentIntent allocation.

The runner then uses the production billing reconciliation function against local SQL, verifies paid Essential/monthly owner state, records one fictional GBP50 service after that payment and verifies one open 50p commission entry. Commission invoicing stays disabled in both local SQL and the local handler configuration. It does **not** collect the commission. The production cancellation handler must successfully schedule period-end cancellation. Cleanup then cancels the tagged fixture subscription immediately, detaches the tagged method and deletes only the verified fixture customer. Paid test invoices remain in Stripe's test audit history.

All created objects carry the same `jovabook_test_run`, `salon_id`, `app: jovabook` metadata where supported. Names include TEST and the run ID. Requests use run-scoped idempotency keys. Never use this harness for existing customers or businesses.

## Receipts and unknown outcomes

Secret-free files go under the repository's existing ignored `.jovabook-test/stripe/` directory:

- `<run-id>.intent.json` is written before provider fixture creation and is never overwritten.
- `<run-id>.<sequence>.progress.json` files are immutable, flushed snapshots written before each creation request and immediately after a verified ID is returned. They include expected sandbox, fixture scope, operation and idempotency key. Read the highest numbered complete JSON snapshot; a crash during a later write leaves the earlier snapshots intact.
- `<run-id>.json` is the final report when the CLI returns normally.

A crash may leave only intent/progress. A lost creation response is marked `manual_review_unknown_creation`, even if known-object cleanup succeeds. An unattached method, foreign metadata or unverified cleanup also prevents a passing result. Stop and reconcile the stored run metadata/idempotency keys in the **expected sandbox** before starting a new run. Do not guess IDs, bulk-delete account records or retry a creation using a new key. There is deliberately no automatic resume command. Receipts contain object IDs, not keys, tokens, passwords or raw provider errors.

## Clock and coverage limits

SQL `now()` and `clock_timestamp()` calls are redirected only in the ephemeral fixture copy to a local clock function. Registration starts four local days earlier to expire the local trial. After the real test payment, that clock advances to a later service occurrence for ledger verification. No source SQL files change. **A Stripe Test Clock does not advance SQL time.** This runner creates no Stripe Test Clock and does not simulate a provider renewal by moving SQL time.

A passing real run verifies account/catalog, one actual test subscription payment, production reconciliation into local owner state, local commission recognition, period-end cancellation and scoped cleanup. It does not prove:

- Hosted Checkout or billing portal interaction, including the required upgrade portal configuration.
- Actual webhook delivery, signatures, retries or operational scheduling.
- Renewals, annual subscriptions, commission invoice payment, declines, SCA, refunds or credits.
- Hosted Supabase permissions, production readiness or multi-connection concurrency.
- Guest merchant deposit Checkout. That production flow is not implemented; customer card setup is a separate feature.

No billing, recovery, SMS, deletion, commission worker or hosted activation flags are changed by this script.
