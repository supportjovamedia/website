# SEO update — 5 September 2026

This source is the latest version and supersedes JovaMedia-final-website.zip.

## Implemented

- Distinct titles and descriptions on all 29 indexable pages, including all 20 services. Page-specific Open Graph and Twitter titles, descriptions and canonical sharing URLs replace inherited homepage sharing metadata.
- Production canonical URLs, server-rendered content, crawlable HTML links, accessible headings, descriptive image alternatives, local fonts and responsive compressed images retained.
- Organization and WebSite JSON-LD with stable identifiers. Each service has Service structured data pointing to the agency; visible service breadcrumbs and matching BreadcrumbList markup added. No invented reviews, ratings, client results, addresses or social profile claims.
- Related service links and a contact action on each service page improve discovery and onward navigation. Existing service content and deliverables remain.
- XML sitemap includes only the 29 canonical indexable pages. The unfinished Insights page remains accessible with noindex/follow until real guides are published. Fictional prototypes retain their noindex controls and stay out of the sitemap. Robots.txt permits crawling of public content and advertises the sitemap. Assets remain crawlable.
- Vercel preview deployments send X-Robots-Tag: noindex, nofollow. Production deployments retain normal indexing behaviour.
- Optional Google Search Console and Bing Webmaster verification tokens supported via GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION. No tokens have been invented or accounts connected.
- Mobile menu items and its project CTA now align right, including tablet widths where the mobile menu is used. Logo and hamburger positioning remain intact.

## Validation

Production build and ESLint pass. All 11 tests pass, including new checks of every sitemap page for unique metadata, matching social URLs, valid JSON-LD, service/breadcrumb consistency and unfinished-page indexing controls. Existing route, canonical, 404, download and contact checks also pass.

## After approving and deploying

1. Verify ownership of jovamedia.com in Google Search Console and Bing Webmaster Tools, using their supplied DNS record or the supported verification environment variables. DNS records and account access are not included in this code change.
2. Submit https://jovamedia.com/sitemap.xml in those tools. Inspect the homepage and key service URLs and check the live host's canonical redirects and indexability.
3. Monitor indexing, search queries, clicks and real-user Core Web Vitals. Fix issues reported against the live deployment.
4. Publish useful original guides, genuine client case studies with permission and accurate business information. Replace placeholder social destinations with the real agency profile URLs when available. Review content periodically rather than generating duplicate location or keyword pages.
5. When Insights contains substantive published guides, remove its noindex metadata and add the page and articles to the sitemap, with accurate publication/update dates.

SEO improvements help crawlers understand and discover the site; they do not guarantee positions or immediate indexing. No production deployment, search-engine submission or domain change was made in this update.

## References

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google developer guidance: https://developers.google.com/search/docs/fundamentals/get-started-developers
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

Browser verification also passed at 320, 390, 850 and 1440px: no horizontal overflow; right-aligned mobile menu and Escape close confirmed; updated service page passed desktop/mobile accessibility checks with no runtime errors. Preview and production indexing header conditions were verified.
