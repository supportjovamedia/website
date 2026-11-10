# JovaBook request reductions

Measurements use isolated local HTTP servers and mocked APIs. They are regression evidence, not a forecast of total production traffic.

## Reloads

The owner source document referenced 49 scripts and 50 stylesheets. The production build now combines the blocking entry scripts, deferred application scripts and ordered styles into three bundles. Runtime config remains separate so deployment configuration and offline fixtures still work. The Google SDK remains lazy.

Operator has one application bundle, one stylesheet bundle and separate config. Its generated page uses an inline favicon to avoid the automatic missing-favicon request.

Bundle URLs contain content hashes and receive `public, max-age=31536000, immutable`. HTML revalidates so a new release can select new bundle URLs. Unversioned legacy assets retain their short cache and remain available for already-open clients. Relative CSS font URLs are rewritten to their original root paths.

The pinned Google SDK filename also receives the one-year cache. An SDK update must use a new versioned filename; never change that file in place.

| Surface | Cold static requests | Warm reload | Hard reload |
| --- | ---: | ---: | ---: |
| Owner, built output | 6 | 1 | 7 |
| Operator, built output | 5 | 1 | 5 |

Counts include HTML and fonts actually requested by the tested screen. Other routes, images, browser cache eviction and hard reload behaviour can change them. A browser cache hit avoids a CDN request; a response served by the CDN still counts as a request.

## Data operations

- Business details and Website confirmation previously used 12 or 24 browser requests depending on the editor state. They now use four: pre-write account status, salon save, exact owner/business salon read and fresh account status. Row mutations overlapping these operations retain the full authoritative refresh for booking and payment side effects.
- Operator Notifications no longer fetches an unused business directory: two direct Supabase reads replace three. Overview retains its five guarded reads.
- Concurrent main-site consent revocations share one same-handoff request. Failures retain the ability to retry explicitly and cannot clear a newer handoff.
- Password login passes a private, one-use, five-second proof of its freshly verified access into the immediately following diary read. It removes one duplicate serial status request, retains the mandatory fresh post-read check, and cannot authorize writes or a different owner/business.
- Business creation records its successful receipt privately so a failed follow-up verification can retry the exact same business without creating another. Logout, a new authentication intent and owner changes invalidate the receipt.
- Google SDK download has a bounded deadline and retry cleanup. The callback keeps its same-tab code and PKCE state until the SDK is ready; OAuth exchange and account writes are not automatically retried or cut off by an artificial timeout.
- Dashboard data has no idle, focus or visibility refresh. Notifications alone poll their own scoped Supabase activity feed.

Direct Supabase requests are separate from Vercel CDN traffic. Booking `/api/jovabook` calls currently cross the booking project and the main API project, so project totals can show both hops. Browser request counts must not be labelled as identical to team-wide Vercel usage.

## Release checks

Run the request-count and bundled-browser tests before release. The release verifier reconstructs both generated pages and bundles from the approved commit, checks their manifest and source hashes, and checks both production project aliases. Deploy booking with `node build-assets.mjs` and output directory `dist`; publishing the source document directly restores the old high file count and must fail verification.

Further work should measure a specific flow before changing it. Initial diary reads and generic booking/customer mutation refreshes intentionally retain broader authorization and side-effect checks. Do not replace them with long-lived private response caching to reduce a counter.
