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
- No cookies, IP fingerprints, visitor identifiers or unique-visitor metrics are collected by this tracker. No `SHORT_LINK_SALT` is required.
- Unavailable storage is shown as unavailable, rather than zero. Built-in link addresses remain available to copy.
- The GA4 report opens separately for consented visitor and conversion reporting. It requires the operator's own Google Analytics access. These are separate measures from redirect request counts.
- Landing-page analytics remain governed by the existing analytics consent controls.

## Storage, access and release

The server uses the existing Upstash credentials, with the newsletter-specific environment variables taking precedence. No SQL migration is required. Only the server reads those credentials. The Links API checks the bearer session with `portal_identity` and requires the operator role for listing and creation.

Existing codes are immutable. Public destination paths are validated on the server, and short-link destinations must not point back into `/go`. Storage failure must not hold up the redirect for tracking writes.

Release requires the marketing server routes and booking site's Operator JavaScript/CSS to be published together. Verify configuration, the three redirects and their UTMs, the authenticated Links tab, creation validation and an unavailable-storage response. Browser tests use intercepted APIs and fictional data, so they do not prove live credentials or deployment configuration.
