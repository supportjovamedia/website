# Design and subscription requests

This revision refreshes the owner workspace and adds a Subscription page with a separate live-account and browser-demo flow. The review branch is `codex/jovabook-design-and-subscriptions`.

## Plans and commercial scope

| Plan | Proposed monthly guide price | Staff roster limit |
| --- | --- | --- |
| Essential | £20 | 1 |
| Standard | £50 | 5 |
| Premium | £100 | 10 |

The limits count every staff record, including inactive staff. Existing records are never deleted to fit a lower limit. The core booking tools already exist; the additional Standard and Premium feature packages are still to be agreed. These guide prices do not create a subscription product, a payment obligation or a charge.

Billing is not connected. The page must say so and must not describe a plan request as a completed purchase or an activated upgrade. Stripe checkout, payment-method collection, recurring charges, billing webhooks and automatic plan activation are outside this revision.

## Live-account behaviour

The active plan comes from the protected `salons.plan` column. Owners can request a different plan and cancel their pending request. They cannot activate an unpaid plan through the client, editable workspace settings or the request RPCs.

One request may be pending per salon. Repeating the same target returns that request without creating a duplicate. Choosing a different target cancels the previous request and preserves it in the audit history before creating the replacement. A request for the current active plan is refused. A target whose staff limit is below the current roster is refused with instructions to review staff records first.

Requesting or cancelling a change does not alter the active plan, staff entitlement, salon subscription status, payment settings, staff records or appointments. The `applied` and `rejected` audit statuses are reserved for a future trusted review process; no owner-facing RPC sets them. A later activation process must independently confirm payment arrangements, agreed features and the current roster before changing the protected plan.

The browser demo can preview a plan and its staff limit locally. Its preview does not change a live salon or start a paid subscription.

## Database contract

Apply `supabase/migration_subscription_requests.sql` after the existing combined setup and `migration_owner_experience.sql`. It adds `subscription_change_requests` with owner-read RLS, no direct authenticated write privileges, and a unique index allowing one pending request per salon.

| RPC | Purpose |
| --- | --- |
| `owner_subscription()` | Read the active plan, roster count, pending request and capability flag |
| `request_plan_change(p_target text, p_salon uuid)` | Record an owner-authorized plan request |
| `cancel_plan_change(p_id uuid, p_salon uuid)` | Cancel that owner's pending request |

All responses include `plan`, `staff_limit`, `staff_count`, `billing_connected: false`, `pending_request` and `changes_supported: true`. Successful request and cancellation responses also include `ok: true`. A pending request contains `id`, `from_plan`, `to_plan`, `status` and `requested_at`.

Mutation RPCs lock the salon row and require a non-null expected salon ID matching the authenticated owner. Invalid requests and capacity failures raise SQLSTATE `23514`; owner or tenant failures raise `42501`. Anonymous callers cannot execute these RPCs or read request records. An owner's record history cannot be read or modified by another owner.

The host captures the current salon and session, checks them after pending saves, sends the expected salon ID, and discards responses after an account change. Live responses never activate client entitlements. If the migration is absent, the page keeps plan-change actions unavailable and leaves the current plan unchanged.

## Verification and release status

The design lead, Astra, personally approved actual desktop, tablet and phone renders of the workspace and the integrated Subscription page. Workspace colour presets affect the navigation rail and surrounding canvas. The mobile calendar initially opens in Day view and remembers an explicit Day, Week or Month selection.

Validation passed 45 Node unit tests, three PostgreSQL-engine database tests, 16 full owner/customer browser scenarios, and six focused subscription browser scenarios. The browser runs use local demo data and explicit API mocks, with stable application source, no browser exceptions and no unexpected external requests. Subscription checks cover preview persistence, blocked downgrades, review before request, single-flight submission, pending cancellation, missing endpoints and late responses preserving another salon's form draft. Browser proofs also cover the initial mobile Day view and persistence of an explicit Week choice.

Local PGlite tests exercise the real combined setup, owner-experience migration and subscription-request migration. They cover direct-write denial, anonymous and foreign-owner access, tenant checks, current-plan refusal, idempotency, replacement and cancellation history, roster limits, unchanged active plan/payment state, and parent-account cleanup cascades. The existing owner-experience database tests also pass against both supported foundations.

Run from the repository root using an existing PGlite installation:

```powershell
$env:BOOKING_NODE_MODULES = (Resolve-Path '../../jovamedia-website/node_modules').Path
node --test booking-demo/tests/subscription-requests-sql.mjs booking-demo/tests/owner-experience-sql.mjs
```

The subscription-request migration has not been applied to the hosted database. This revision needs its own reviewed PR and explicit merge approval. Earlier release approval does not approve this PR. After approval, inspect the current target schema, apply the additive migration, verify the live request and cancellation flows with designated fictional records, and deploy the approved source. Report hosted verification and deployment separately from local test results.
