# Short links and the Operator Links tab

The Links tab is private to verified JovaMedia operators. It provides Instagram, Nextdoor and WhatsApp launch links, a copy button for each, and a form for additional campaign links.

| Source | URL | Medium | Campaign |
| --- | --- | --- | --- |
| Instagram | https://www.jovamedia.com/go/instagram | social | jovabook_launch |
| Nextdoor | https://www.jovamedia.com/go/nextdoor | social | jovabook_launch |
| WhatsApp | https://www.jovamedia.com/go/whatsapp | message | jovabook_launch |

All three lead to `/jovabook` with campaign labels attached. Publish and verify the routes before sharing these URLs externally.

## Counting and privacy

- Clicks count requests, including repeat requests. Detected preview crawlers are counted separately. Detection is heuristic; these numbers do not establish how many people visited.
- Counts cover the lifetime of each link, since tracking began. Aggregate counts remain while the link exists.
- Estimated unique opens today use the trusted Vercel client IP and coarse browser/OS family. A keyed hash is different per link and UK calendar day. Raw IPs, full browser strings, full referrers and individual journeys are not stored. Daily hashes expire no later than 48 hours after the day ends. Only broad referrer categories and aggregate counts are retained. The existing server storage token derives the daily hash; it is never public.
- Same-day repeats normally count once. Networks shared by users may undercount, network/browser changes may overcount, and recognised preview detection is heuristic. Daily estimates must not be summed and called unique people for a month. Older totals cannot be backfilled.
- Short-link counting honours the explicit jova-link-statistics=off preference, Global Privacy Control and Do Not Track. Reject all also records the opt-out; the privacy page offers an independent 44px toggle. No new tracking cookie is created, only the preference cookie when a visitor makes a choice.
- This request-only aggregate measurement is separate from consent-based GA4 and never joins its hashes to signup, payment, email or customer data. The privacy notice explains purpose, retention, provider and objection. This implementation does not claim that hashing alone establishes anonymity or an automatic legal exemption.
- Unavailable storage is shown as unavailable, rather than zero. Built-in link addresses remain available to copy.
- The GA4 report opens separately for consented visitor and conversion reporting. It requires the operator's own Google Analytics access. These are separate measures from redirect request counts.
- The Daily activity log adds date presets, custom dates within the last 30 UK calendar days, and an exact campaign-link filter. Each row is a daily aggregate: repeat opens, detected previews and the latest open that day. The selected-period totals use those daily aggregates. No individual-visit log or new visitor identifier is collected.
- Daily buckets expire after 35 days. Daily collection starts with the first recorded request after this release; older lifetime totals cannot be backfilled. The UI shows the recording start, unavailable storage and dates predating collection explicitly. Daily counts are not monthly unique people. A campaign link's label identifies the link shared, not necessarily the app in which someone eventually opened it.
- The launch-funnel link opens the existing GA4 exploration for consented registration, card-trial and payment steps. Redirect counts are not joined to customer data or treated as funnel conversions. No GA4 credentials are added to the operator app.
- Landing-page analytics remain governed by the existing analytics consent controls.

## Storage, access and release

The server uses the existing Upstash credentials, with the newsletter-specific environment variables taking precedence. No SQL migration is required. Only the server reads those credentials. The Links API checks the bearer session with `portal_identity` and requires the operator role for listing and creation.

Existing codes are immutable. Public destination paths are validated on the server, and short-link destinations must not point back into `/go`. Storage failure must not hold up the redirect for tracking writes.

Release requires the marketing server routes and booking site's Operator JavaScript/CSS to be published together. Verify configuration, the three redirects and their UTMs, the authenticated Links tab, creation validation and an unavailable-storage response. Browser tests use intercepted APIs and fictional data, so they do not prove live credentials or deployment configuration.

For the daily-history release, no database migration or new secret is required. Publish the updated short-link server and operator assets through the normal PR review workflow. Confirm a new authorised campaign open appears in its UK-day bucket after release, excluding that verification from commercial reporting. Run `node --test tests/short-links.test.mjs tests/short-links-unique.test.mjs tests/short-links-history.test.mjs` and `node booking-demo/tests/operator-links-browser.mjs`. The latter exercises date/channel filters, keyboard submission, small screens, unknown history, retries, logout races and role denial using synthetic data.
