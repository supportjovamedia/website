# JovaBook request controls

## Evidence and limits

The production review reported roughly 22,000 billing/status requests over 12 hours, compared with roughly 50 requests for individual static assets. These are different categories. A cached response can still be a CDN request; a high request count does not by itself identify the visitor, browser, localhost preview or person responsible. The billing/status volume is the primary lead for request reduction, rather than increasing private-response cache lifetimes.

No listener was present on local port 4458 during this audit. The saved preview server source at `output/fresha-dashboard-review-2026-11-09/preview-server.mjs` serves an offline `config.js` and uses `connect-src 'self'`. That establishes how this saved preview was configured. It does not establish what process or page was open historically and cannot attribute production traffic to localhost.

## Additional first-party review

This review covered booking JavaScript outside the separate app, account, refund and Operator changes. Vendor code and tests were excluded from the scan.

- The registration-code and customer-resend timers update local countdown labels. They do not fetch on each tick.
- Integrations, deposit settings and subscription panels already guard concurrent loading and retain a completed-load state after failure. Their explicit refresh buttons can request a fresh status. No recurring network timer was found in those modules.
- Email activity refresh is explicit and prevents concurrent refreshes.
- Operational diagnostics use direct Supabase requests with a per-page cap and event deduplication. They do not create an automatic retry queue. This does not explain a repeated Vercel billing/status request by itself.
- Customer portal identity checks validate their own session scope. They have no automatic interval in `customer-portal.js`. Do not cache another customer's data or weaken access checks to reduce request counts.
- The owner funnel had one small duplication: initial execution, DOM-ready and page-show events could each revoke the same consent handoff before the first response arrived. `owner-funnel.js` now shares the in-flight revocation for that handoff. A failed request remains retryable on a later event, with no background retry timer; a late old response cannot clear a newer handoff.

The funnel change is a bounded request reduction and is not claimed to explain the billing/status volume.

## Cache and deployment decisions

Keep private account, billing, refund and customer responses private and non-cacheable. Share only static resources through the public CDN. Retain versioned JS/CSS URLs and the existing static cache policy; a deployment must publish the static booking project as well as any changed main/API source. Check the returned assets and both production aliases rather than asking users to clear authentication storage.

The release verifier now includes Operator HTML, its critical scripts/styles, refund controls and owner-funnel code alongside the booking entry point and authentication SDK. A stale Operator bundle or missing refund script fails the check. The verifier is a deliberate release command, not a scheduled monitor or a polling loop.

After deploying approved request changes, compare the same endpoint over equivalent active-use and idle windows. Separate document/static requests, notification requests and billing/status requests. Check idle tabs, hidden tabs and intentional refresh separately. Do not claim a production reduction from local tests alone, and do not remove authorization checks or notification delivery to obtain a lower count.
