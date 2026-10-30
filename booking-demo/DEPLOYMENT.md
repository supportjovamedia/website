# JovaBook deployment

Source: `supportjovamedia/website`, root directory `booking-demo`.

Vercel project: `jovamedia-booking-preview` (`prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT`). Team: `supportjovamedia-3120`. The custom domain is https://book.jovamedia.com/.

Inspection on 30 October 2026 found production deployment metadata naming `main`, commit `0e82fb5a67c1512dce8496600063d55e69d16195`. Automatic deployment of the new feature branch was not observed, so Git integration should be verified before relying on push-triggered previews.

This app is a buildless static site. Framework is Other, root is `booking-demo`, and output is the folder itself. `vercel.json` includes noindex/nofollow headers. Existing account configuration stays unchanged.

## Review workflow

The simplified workspace is developed on `codex/jovabook-acuity-workflows`. Push the feature branch, open a pull request against `main`, and inspect its Vercel preview. Do not merge, promote or assign the production domain without explicit approval.

Vercel Authentication protects non-custom deployment URLs on this project. A signed-in team member may need to open the preview. Deployment state READY means the site was built successfully, not that live booking, security, delivery or billing has been end-to-end certified.

No provider purchases, paid upgrades, DNS changes or production database migrations are part of this change.
