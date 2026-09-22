# Search and sharing handoff

Checked against production on 22 September 2026.

## Website changes

- A 1200 x 630 capture of the live homepage replaces the old yellow sharing artwork.
- All indexable pages use a new static image URL, `/share/jovamedia-homepage-2026-09.png`, for Open Graph and Twitter cards.
- Existing image routes also return the new capture.
- Homepage and service descriptions include the expanded offering; Organization data includes all eight service areas.
- `/terms-of-service` redirects permanently to `/terms`.

The capture excludes the cookie dialog and chat launcher. Refresh this image and version its filename after substantial homepage design changes. Preserve 1200 x 630 dimensions and keep both social tags in sync. This is a static capture, not a live screenshot service.

## Verified production foundations

All 17 sitemap URLs returned HTTP 200, matched their canonical URLs and did not declare noindex. The sitemap includes the eight current service pages. The non-www domain redirects to www. The former legacy-software-updates service URL redirects permanently to system-modernization. Robots permits crawling and advertises the sitemap. The site has Organization, WebSite, Service and service breadcrumb structured data.

These checks establish crawlability, not actual indexing or ranking. Search Console ownership, sitemap submission and URL indexing reports were not accessible during this audit. Absence of an HTML verification tag does not rule out DNS verification.

## Owner setup after deployment

1. Open Google Search Console and add or select the `jovamedia.com` Domain property.
2. If unverified, add Google's supplied TXT record with the domain's DNS provider. Preserve existing DNS records.
3. Submit `https://www.jovamedia.com/sitemap.xml`.
4. Inspect the homepage, About, Services, Contact and System Modernization URLs, then request indexing where appropriate.
5. Check Page indexing reports for excluded URLs and Google's selected canonical.
6. Use Bing Webmaster Tools to verify/import the site and submit the same sitemap.
7. Refresh cached social previews using the relevant platform's sharing inspector where available. Existing messages may retain the previous cached card.

Google chooses sitelinks automatically. Google AI search uses the same crawlability and indexing foundations as Search. No special AI file or structured data can guarantee inclusion.

Sources:
https://developers.google.com/search/docs/appearance/sitelinks
https://developers.google.com/search/docs/appearance/ai-features
