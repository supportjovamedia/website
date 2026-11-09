# JovaBook release checks

JovaBook has two production projects. A successful marketing deployment does not publish the booking application.

| Surface | Vercel project | Production domain | Source |
| --- | --- | --- | --- |
| Booking workspace and owner login | `jovamedia-booking-preview`, `prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT` | `book.jovamedia.com` | Static `booking-demo` directory |
| Marketing and shared API | `project_jovamedia`, `prj_SMgNZdv77o7zdKf3Fb7Yv7MVAyvE` | `www.jovamedia.com` | Next.js repository root |

Both projects belong to `team_NcSiOynepf1jMw4CtMIkJTzW`. The booking project has historically required an explicit deployment after merging. Do not infer its release from a green main-project build or a merged PR.

## Before release

1. Use a feature branch and reviewed PR. Merge only with the user's authorization. Record the full merged commit that both sites must serve.
2. From `booking-demo`, run `npm run test:release`. This includes the owner suite, Google callback/adoption regressions, persisted owner-session restoration tests, an actual-app browser test using intercepted APIs, manual-refresh and owner-funnel request controls, recovery backend tests and the release verifier's local-server tests. Passing the owner UI suite alone is insufficient.
3. Inspect actual desktop and phone layouts and interactions. Check a returning user with a persisted session, a fresh tab without the old tab marker, a reload, Google sign-in and retry after a temporary account-access failure. Test against fictional local fixtures first. An owned production account is needed for any final live sign-in check; no client account should be used as a test fixture.
4. Normal deployments preserve the auth origin, storage keys, refresh tokens and existing account records. Do not clear local/session storage, invalidate all sessions or reset accounts to make a new UI appear. Give changed scripts and styles new versioned URLs in `index.html`, preferably content hashes. The booking project caches JS/CSS for five minutes; changing bytes at an unchanged URL can leave existing browsers running older logic during that window. Missing assets and failed deployment checks must be fixed at the release layer.
5. Coordinate any separately required database migrations or Auth-provider changes through their owning release instructions. A UI update does not authorize changing OAuth, mail templates or Auth rate settings.

## Publish both surfaces deliberately

1. Verify the intended team, both project IDs, the exact merged commit and production environment.
2. Publish that commit's static `booking-demo` source to the booking project, preserving its static root, `vercel.json` rewrites and existing provider configuration. Publish the repository root to the main/API project when it does not already serve the same expected commit.
3. Inspect the deployment records and test the production candidate before assigning traffic where staging is supported. A `READY` preview or a new deployment URL does not prove the production custom domain moved.
4. After publication, verify both live aliases and the actual booking bytes using the command below. It uses GET requests only, checks the two project IDs and full commit in current Vercel deployment metadata, and compares booking and Operator HTML, their critical scripts/styles, refund controls, owner-funnel code and the self-hosted Google SDK with files from that Git commit. Missing files, stale HTML, mixed cached scripts, missing metadata access or an omitted expected commit fail the check.

```powershell
# Supply VERCEL_TOKEN securely through the environment or approved secret injection.
# Never paste a token into a command argument, commit it or save it in the report.
cd booking-demo
npm run verify:release -- --commit <full-approved-merged-commit-sha>
```

The full expected commit must be available in the local Git object database. The verifier deliberately has no assets-only success mode and does not use the working tree as a substitute for a committed release. A denied Vercel metadata request is a failed check, not evidence that deployment succeeded. Its output includes commit IDs, project IDs and asset hashes, never source bodies or credentials. Update the critical asset list in the same PR when changing the workspace entry points or SDK loader. Network-byte checks do not inspect older files already cached in a user's browser, so asset versioning and the returning-user browser check are both required.

5. Recheck an existing user's session and the production desktop/phone workspace after the aliases move. Confirm the new design is visible without asking users to log out, clear storage or create another account. Record both deployment IDs, the commit, verifier result and any live-flow checks not performed.
6. If either surface fails, keep the release incomplete. Fix and redeploy the affected project or use the approved rollback process, preserving user sessions and saved data. Recheck both surfaces after any rollback or later redeployment.

## Maintenance notices

Ordinary UI deployments should be zero-downtime and retain existing sign-in sessions. They do not need a maintenance notice.

If a planned change really requires an interruption, prepare an advance notice naming the affected functions, the expected start/end time and timezone, what users should do before the window, and how they will know service is restored. Send or publish it only through an authorized channel. Do not announce an outage, completion or recovery that has not been verified. A maintenance message is not a substitute for testing existing-user access.
