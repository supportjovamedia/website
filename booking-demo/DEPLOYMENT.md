# JovaBook deployment

Source: `supportjovamedia/website`, root `booking-demo`.

Vercel project: `jovamedia-booking-preview` (`prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT`), team `supportjovamedia-3120`. Domain: https://book.jovamedia.com/.

The previous simplified workspace was released with approval through PR84, merge `7b7fbd89336bc8a441b2276d655c86403a39435b`, deployment `dpl_6ikBMdadqwnAKYLExsibS9k1oSG9`. This owner-experience revision is a separate review branch, `codex/jovabook-owner-experience`, and includes the demo-login repair from PR85.

The app is static: framework Other, root `booking-demo`, no install/build command, output `.`. `vercel.json` deliberately sets noindex/nofollow. Git pushes have not produced automatic deployments for the booking project, so verify the deployment explicitly rather than assuming a branch push shipped it.

## Rollout sequence

1. Review and explicitly approve the owner-experience pull request.
2. Use the owner account for Supabase project `rffsulstatmwzvrdgvec`. Read the target project's migration status before applying SQL.
3. Apply `supabase/migration_owner_experience.sql` once, after the existing schema and two diary migrations. It is wrapped in a transaction and removes no records.
4. Verify owner capabilities, per-day availability, roster limits and series rollback against the hosted database using designated fictional test records. Check true concurrent slot contention separately from local SQL tests.
5. Merge the approved PR and deploy the exact merge to Vercel with an explicit production target.
6. Verify the custom-domain asset hashes, desktop/mobile flows and ordinary single-appointment customer journey. Keep account-provider checks distinct from an isolated browser demo.

Until step3 is complete, capability guards disable new live daily-hours saving, staff creation and appointment series. The demo remains available for reviewing the full experience. Do not replace config.js with credentials for a different project to work around access problems.

## Verified project and rehearsal

The repository and live config now point to the accessible `jovabook` project `rffsulstatmwzvrdgvec`. Concurrent main commits `75d7bf2` and `e8335b2` were merged into this branch, preserving the publishable-key header handling, updated signup function and combined project setup SQL. The former `emyjuccsfnxqrsztpzly` configuration is not used.

Read-only SQL checks found two salons, two Auth users and no appointments at the time of inspection. Eight table column fingerprints, access policies, triggers and RLS matched the combined setup. A stricter null-phone guard in live `save_setup` is preserved in the fresh setup source. All52 existing non-NOTNULL constraint definitions also matched after accounting for PostgreSQL17/18 catalog differences. No existing constraints were replaced.

A hosted rehearsal ran the additive migration inside a single transaction with assertions for signatures, grants, protected plans, schedules and unchanged application-row hashes. Its final ROLLBACK receipt confirmed that no capability function or plan column persisted. This proves compatibility with the current hosted schema, not permanent deployment. Apply the actual migration only after release approval. True simultaneous browser writes and live provider delivery are separate checks.

Payments, email/SMS providers and AI are not connected by this release. No provider purchases, paid upgrades or DNS changes are required.
