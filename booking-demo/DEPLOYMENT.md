# JovaBook deployment

Source: `supportjovamedia/website`, root `booking-demo`.

Vercel project: `jovamedia-booking-preview` (`prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT`), team `supportjovamedia-3120`. Domain: https://book.jovamedia.com/.

The owner-experience release, including the demo-login repair, is live through approved PR86, merge `9987551ab0dc3758ae918a3f594e0e57432a48d3`, production deployment `dpl_GUCFtCfq1g4FSHvHuyD5dNw8PL1P`. Its database migration committed on 31 October 2026. All 15 deployed assets matched the tested source; 12 real API checks and 8 real browser scenarios passed. Simultaneous public booking calls produced exactly one winner. The designated fictional QA user and salon were removed and both removal checks returned true.

The app is static: framework Other, root `booking-demo`, no install/build command, output `.`. `vercel.json` deliberately sets noindex/nofollow. Git pushes have not produced automatic deployments for the booking project, so verify the deployment explicitly rather than assuming a branch push shipped it.

## Historical owner-experience rollout sequence, completed

1. Review and explicitly approve the owner-experience pull request.
2. Use the owner account for Supabase project `rffsulstatmwzvrdgvec`. Read the target project's migration status before applying SQL.
3. Apply `supabase/migration_owner_experience.sql` once, after the existing schema and two diary migrations. It is wrapped in a transaction and removes no records.
4. Verify owner capabilities, per-day availability, roster limits and series rollback against the hosted database using designated fictional test records. Check true concurrent slot contention separately from local SQL tests.
5. Merge the approved PR and deploy the exact merge to Vercel with an explicit production target.
6. Verify the custom-domain asset hashes, desktop/mobile flows and ordinary single-appointment customer journey. Keep account-provider checks distinct from an isolated browser demo.

Step3 is complete for the live project. Capability guards still protect accounts on installations without the owner-experience migration. Do not replace config.js with credentials for a different project to work around access problems.

## Historical project inspection and rehearsal, before release

The repository and live config now point to the accessible `jovabook` project `rffsulstatmwzvrdgvec`. Concurrent main commits `75d7bf2` and `e8335b2` were merged into this branch, preserving the publishable-key header handling, updated signup function and combined project setup SQL. The former `emyjuccsfnxqrsztpzly` configuration is not used.

Read-only SQL checks found two salons, two Auth users and no appointments at the time of inspection. Eight table column fingerprints, access policies, triggers and RLS matched the combined setup. A stricter null-phone guard in live `save_setup` is preserved in the fresh setup source. All52 existing non-NOTNULL constraint definitions also matched after accounting for PostgreSQL17/18 catalog differences. No existing constraints were replaced.

A hosted rehearsal ran the additive migration inside a single transaction with assertions for signatures, grants, protected plans, schedules and unchanged application-row hashes. Its final ROLLBACK receipt confirmed that no capability function or plan column persisted during rehearsal. After explicit release approval, the permanent migration and hosted checks completed as recorded above. Live provider delivery remains separate.

Payments, email/SMS providers and AI are not connected by this release. No provider purchases, paid upgrades or DNS changes are required.

## Later revision: design and subscription requests, 31 October 2026

The branch `codex/jovabook-design-and-subscriptions` is a separate revision. The earlier owner-experience proof above is retained as its own historical receipt; it does not verify or authorize this new migration or deployment.

`supabase/migration_subscription_requests.sql` adds owner-only plan requests and cancellation history. Its RPCs keep the active protected plan and staff entitlement unchanged. Billing is unavailable, no charges are made, and Standard/Premium feature packages remain to be agreed. The proposed monthly guide prices are Essential £20, Standard £50 and Premium £100, with staff roster limits of 1, 5 and 10 respectively. Inactive staff count toward these limits.

The new migration has not been applied to the hosted database. Until it is installed, the Subscription page keeps live plan-change actions unavailable. Browser-demo plan previews remain local. The existing owner-experience migration is a prerequisite.

Local verification passed the subscription-request SQL suite and the existing owner-experience SQL suite on both legacy and combined setup foundations. These tests do not constitute a hosted deployment receipt. See `DESIGN-SUBSCRIPTIONS.md` for the RPC contract, billing boundaries and test command.

For this revision: create the review PR, obtain explicit merge approval, inspect the current Supabase schema, apply the additive request migration, and verify owner/tenant isolation, request idempotency, cancellation history, downgrade capacity and unchanged active entitlements with designated fictional records. Merge and deploy the approved source, then verify the actual desktop/mobile page and custom-domain assets. Do not reuse approval from an earlier release to merge this PR.
