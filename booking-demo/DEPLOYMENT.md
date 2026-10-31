# JovaBook deployment

Source: `supportjovamedia/website`, root `booking-demo`.

Vercel project: `jovamedia-booking-preview` (`prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT`), team `supportjovamedia-3120`. Domain: https://book.jovamedia.com/.

The previous simplified workspace was released with approval through PR84, merge `7b7fbd89336bc8a441b2276d655c86403a39435b`, deployment `dpl_6ikBMdadqwnAKYLExsibS9k1oSG9`. This owner-experience revision is a separate review branch, `codex/jovabook-owner-experience`, and includes the demo-login repair from PR85.

The app is static: framework Other, root `booking-demo`, no install/build command, output `.`. `vercel.json` deliberately sets noindex/nofollow. Git pushes have not produced automatic deployments for the booking project, so verify the deployment explicitly rather than assuming a branch push shipped it.

## Rollout sequence

1. Review and explicitly approve the owner-experience pull request.
2. Use the owner account for Supabase project `emyjuccsfnxqrsztpzly`. Read the target project's migration status before applying SQL.
3. Apply `supabase/migration_owner_experience.sql` once, after the existing schema and two diary migrations. It is wrapped in a transaction and removes no records.
4. Verify owner capabilities, per-day availability, roster limits and series rollback against the hosted database using designated fictional test records. Check true concurrent slot contention separately from local SQL tests.
5. Merge the approved PR and deploy the exact merge to Vercel with an explicit production target.
6. Verify the custom-domain asset hashes, desktop/mobile flows and ordinary single-appointment customer journey. Keep account-provider checks distinct from an isolated browser demo.

Until step3 is complete, capability guards disable new live daily-hours saving, staff creation and appointment series. The demo remains available for reviewing the full experience. Do not replace config.js with credentials for a different project to work around access problems.

## Current access gap

The browser account `support.jovamedia@gmail.com` was able to sign into Supabase, but the target project returned 'You do not have access to this project'. It only listed the different paused project `ezgqycosnizutpepxgxi`. The user has been asked to provide the correct owner session or access. This migration has not been applied live during this revision.

Payments, email/SMS providers and AI are not connected by this release. No provider purchases, paid upgrades or DNS changes are required.
