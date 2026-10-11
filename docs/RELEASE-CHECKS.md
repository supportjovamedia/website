# Website release checks

Run `npm ci` and `npx playwright install chromium` once on a new checkout.

Run `npm run regression` before releasing. It runs isolated handler tests, builds once into `.next-regression`, starts a temporary production server on port 4391, and runs desktop and phone browser journeys. It leaves the developer's port 4331 untouched. The server stops automatically when the browser suite ends.

PR updates and pushes to main run the same command in GitHub Actions. Require the `regression` check in branch protection before merging. This workflow tests locally inside the runner and does not create a Vercel deployment. Failure screenshots and traces expire after seven days. Successful runs do not upload artifacts.

Successful production `deployment_status` events also run the suite against `https://www.jovamedia.com`, using the deployed commit's test definitions. This depends on Vercel's GitHub deployment-status webhook remaining enabled. The workflow does not promote or roll back releases automatically. A post-release failure is visible in GitHub Actions.

To repeat the live check manually:

```powershell
$env:REGRESSION_URL='https://www.jovamedia.com'
npm run regression
Remove-Item Env:REGRESSION_URL
```

On Windows, an installed Edge can be used instead of a downloaded browser by setting `REGRESSION_BROWSER_CHANNEL=msedge`.

## Coverage

- Public sitemap routes, core page headings, same-origin links and rendered image URLs.
- Pricing inclusions, equal desktop heights, aligned feature rows, mobile placeholders and product-specific quote buttons.
- Blank quote validation, optional phone fields and correct selected product and price.
- Simultaneous FAQ open/close, keyboard access, rapid switching and reduced motion.
- Mobile navigation, Escape, restored interaction and scroll state.
- 320px phone through 3440px ultrawide, short desktop layouts, device-frame containment and heading clipping masks.
- Mocked quote/contact delivery, validation/CAPTCHA, checkout safeguards, analytics consent and native chat loading.
- Social image freshness and stripped export metadata.

## Limits

Browser tests allow only same-origin GET/HEAD requests and block third parties. They never send a real enquiry, newsletter subscription, payment, booking or chat message. Delivery handlers use injected test transports. Production inbox receipt, CAPTCHA provider configuration and the separate booking backend still need their own controlled integration checks. Browser assertions catch defined regressions, not every possible visual issue; inspect the approved screen designs before a major design release.

Keep the last working production deployment for rollback. Merge the reviewed PR only after the checks pass, let Vercel's Git integration create the production build, and run the read-only live check before reporting the release complete.

Webhook reference: https://vercel.com/changelog/optionally-disable-deployment_status-webhook-events-for-github-actions
