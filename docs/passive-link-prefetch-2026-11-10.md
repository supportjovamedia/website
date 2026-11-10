# Passive marketing link requests

The header already uses native anchors and the footer already disables Next.js link prefetching. These remain unchanged.

Fresh local production browsing at 390px and 1440px produced five requests for unvisited routes: three for `/privacy-policy` on opening the page and two for `/resources` while scrolling. Each was an RSC fetch with `next-router-prefetch:1`. This local reproduction identifies avoidable background requests; it does not establish the cause or proportion of observed production CDN traffic.

CookieConsent and GrowthSignup now set `prefetch={false}` on every Next.js link, including cookie settings, the checklist privacy text, guides and the conditional successful-submission resource. Their destinations, content, form and consent behavior remain unchanged. Explicit clicks still navigate normally.

The installed version is Next.js 16.4.3 using the App Router. Its official [Link documentation](https://nextjs.org/docs/app/api-reference/components/link#prefetch) describes production viewport prefetching and confirms that `false` disables both viewport and hover prefetching. The tradeoff is that these infrequently used destinations load after the user chooses them.

Verification:

- `node --test tests/passive-links.test.mjs` renders cookie states and both growth forms, including successful resource links.
- Run a current local production build, then `PREFETCH_TEST_URL=http://127.0.0.1:3102 node --test tests/passive-link-prefetch-runtime.mjs` (set the environment variable using the current shell). The browser test blocks nonlocal traffic, requires zero passive route requests at 390px and 1440px, then confirms an explicit Privacy click works. It intentionally fails against the earlier production build containing the five prefetches. Evidence is written to `output/passive-link-request-budget.json`.

Final local production verification used `.next-prefetch-review` on `127.0.0.1:3104`: both 390px and 1440px had zero passive RSC route requests on initial load and a full-page scroll. Explicit Privacy navigation still succeeded after rejecting optional cookies. The earlier build failed the same request-budget assertion with five requests. The targeted unit suites passed 14/14, narrow ESLint passed, and the production build generated 141 static pages successfully. Local logs and baseline/final request reports are under `output/`.
