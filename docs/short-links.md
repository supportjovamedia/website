# Short links and the back-office Links tab

Status: built on branch `feature/short-links-tracker`. Not merged, not deployed.

## What it does
- `https://www.jovamedia.com/go/<code>` records the click, then forwards to the stored page with `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` attached. GA4 and Clarity then pick the visit up as normal, after consent.
- The back office (`book.jovamedia.com/operator.html`) has a **Links** tab: every link, clicks, unique visitors, bot clicks and last click, plus a form to create links.

## Privacy and counting
- No cookies and no stored IP address. A unique visitor is a salted one-way hash of IP + browser + day + link, so a person is counted once per day per link. Needs `SHORT_LINK_SALT`; without it unique visitors stay at 0 and clicks still count.
- Known link-preview crawlers (WhatsApp, Facebook, Slack, etc.) are counted separately as bots and never as clicks.
- A storage outage never blocks the visitor: they are forwarded to `/jovabook` without labels.

## Storage and access
- Uses the existing Upstash database (same credentials resolution as the newsletter automation). No migration.
- The Links API (`/api/jovabook/operator/links`) asks the booking database who is calling and only allows the `operator` role.
- Existing codes are never overwritten. Destinations are same-site paths only.

## Before release (not yet done)
1. Set `SHORT_LINK_SALT` (any long random string) in the production environment.
2. Run `npm run build` and `npm run lint` (could not be run where this was written: dependency install failed).
3. Preview the Links tab against a signed-in operator and create one test link.
4. Add `/go` to the analytics exclusion list only if the redirect ever renders a page. It currently returns a 302 only.

## Naming convention
`utm_source` platform (nextdoor, whatsapp, instagram); `utm_medium` dm or social; `utm_campaign` jovabook_outreach; `utm_content` business type or batch. Codes like `nd-barber-01`.
