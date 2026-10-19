# Websites section: search intent and release checks

Prepared 19 October 2026. This is an implementation note, not a ranking or sales forecast.

## Structure

Primary navigation: Home, Websites, Services, Pricing, About. Get a Quote remains the action. Our Work and Contact Us are linked in the footer.

`/websites` is the overview. Eleven pages address different buyer needs. Website design is removed from the Services directory and mobile Services group. The former `/services/web-design` URL and its two legacy aliases redirect directly to the overview. Salon and beauty website content now lives at /websites/salon-website-design. Its former Services URL redirects permanently to the new canonical address. All internal links, breadcrumbs and sitemap entries use Websites.

Custom and bespoke share one page. Landing and one-page sites share one page. CRM is the internal team workflow; a portal serves existing customer accounts; memberships cover joining, access tiers and renewals. No standalone blog-design or unsubstantiated city/industry pages are added.

## Native keyword check

Google Keyword Planner, checked 19 October 2026: United Kingdom, English, Google, October 2025 to September 2026. Ten seeds were checked together. The location was explicitly changed from All locations to United Kingdom before collecting these figures.

These are average monthly historical ranges, including close variants. They are not unique people, expected visits or organic difficulty. The advertising competition and bids were not used as organic ranking scores. Raw browser evidence and a screenshot are retained in the local research output, outside this public repository.

| Page | Primary buyer phrase | UK monthly range | Supporting wording / decision |
| --- | --- | --- | --- |
| `/websites` | website design Harrow | Earlier 18 October check: 10-100 | London, small business web design, website types. Accurate service coverage, no invented office. |
| `/websites/landing-pages` | landing page design | 100-1,000 | One-page website, single-page business website, landing page designer. |
| `/websites/business-websites` | brochure website design | 10-100 | Small business website design, service business websites. Existing research also supports the broader small-business cluster. |
| `/websites/ecommerce-websites` | ecommerce website design | 1,000-10,000 | Ecommerce website developer, online shop design; Shopify website design was a related suggestion at 100-1,000. Platform is agreed per project. |
| `/websites/portfolio-websites` | portfolio website design | 100-1,000 | Creative portfolio, professional portfolio website. Broad portfolio terms can have DIY/inspiration intent. |
| `/websites/bespoke-websites` | bespoke website design | 100-1,000 | Custom website design, custom web development. These belong together. |
| `/websites/website-redesign` | website redesign services | 100-1,000 | Website refresh, website migration, existing site improvements. |
| `/websites/booking-systems` | booking system development | 10-100 | Custom appointment booking, booking website design. Distinguish development from an off-the-shelf SaaS subscription. |
| `/websites/crm-systems` | custom CRM development | 10-100 | Bespoke CRM, client management system development. Generic buy CRM/software pricing phrases are a poorer match for a project service. |
| `/websites/customer-portals` | client portal development | 10-100 | Customer portal development, client account portal. |
| `/websites/membership-websites` | membership website design | 10-100 | Subscription website, member access, paid content. Scope payments and access separately. |

Native Keyword Planner produced 1,621 suggestions, but this is a checked ten-seed mapping, not an audit of every suggestion. Large displayed year-on-year percentage changes in broad bands are not treated as proof of market collapse or explosive growth.

## On-page implementation

- Distinct titles, descriptions and visible topics for all eleven pages, with self-canonical URLs and matching social URLs.
- Server-rendered content, static route generation, a single main heading and genuine 404 responses for unknown types.
- BreadcrumbList and Service structured data agree with the visible page and its canonical URL. The overview ItemList matches its eleven cards.
- Crawlable links between the overview, detail pages, work, packages and cost guide. No meta-keyword stuffing or cloned synonym pages.
- Website-type quote links select a validated option; the existing email handler includes that label. Product IDs are checked against the current catalogue. No live test lead is sent by automated checks.
- Consent-aware analytics recognises only the overview and the eleven known marketing routes. Replay permits their fixed section anchors and validated quote selections; arbitrary subpaths, account URLs and private query values remain excluded.
- Photo files are local WebP derivatives. No image generation was used. The revision removes the fictional miniature websites and browser chrome. Booking, CRM, portal and membership interface illustrations have accessible descriptions and contain no client data. Genuine Qaiser Watches work is identified separately. See `websites-media-sources.json` for sources and processing.
- No new promises of ranking, conversion improvements, price, availability or project outcomes. Monetary prices remain on Pricing; website detail pages link to relevant packages and explain scope separately.

## Revision after visual and content review

Each main heading now names its actual service. All eleven pages contain distinct buyer guidance, a service-specific scope, planning and cost information, five or six practical questions, and related services. `lib/website-editorial.mjs` records the primary phrase, supporting cluster and content for each page. The homepage retains the broad small-business introduction; the Websites hub introduces the Harrow/London service and routes buyers to the appropriate detail. The brochure page focuses on multi-page service-business requirements rather than creating another location clone.

The shared presentation uses the homepage's desktop scroll-chapter and native mobile swipe-card model. Reduced motion keeps the full static reading order. Photos and authored interface illustrations support the content, without invented client names or results. Shared components own the layouts and interactions rather than a stylesheet per service.

The final list-page section invites requirements that are not in the catalogue and links directly to Get a Quote. The Qaiser Watches example uses a clean crop of the delivered site's hero, without exposing a clipped fragment of the following section.

## Validation and release

Run the relevant handler tests, website route/metadata/redirect/quote tests, lint and production build. Browser checks cover phone/desktop layouts, mobile submenu focus/return/Escape, narrow-screen reflow, images, enquiry selection and navigation spacing.

Review the preview and merge only with explicit approval. The release includes a compact first-visit consent notice, a captured first frame before the existing homepage animation, and batched motion measurements. Consent choices remain equally prominent and optional tracking remains off until acceptance. PR #75 overlaps this shared first-visit work and changes the retired web-design route; reconcile it before any later merge so it does not recreate the old public page or reintroduce the Services card.

After production deployment, verify redirect destinations, sitemap and live forms. Then inspect Search Console indexing and compare query/page impressions, clicks, CTR and average position to a dated baseline. Track received enquiries and paid projects separately. A next-day ranking gain is not guaranteed.

## Sources

- [Google Keyword Planner](https://ads.google.com/aw/keywordplanner/)
- [Google: helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: spam policies, including doorway abuse](https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse)
- Search intent cross-checks on 19 October included primary agency service pages for custom CRM, booking development, memberships, landing pages and client portals. Search results are location/time dependent; their ordering was not recorded as a universal rank.
- [Unsplash licence](https://unsplash.com/license)

## Photography and salon-page follow-up, 19 October 2026

The hub and eleven detail pages use separate photographic placements. Hero, scope and editorial photographs do not repeat within or between these pages. Related options use text cards; the genuine Qaiser capture appears once on the hub, with text case-study links on relevant detail pages. The 93 additional WebP photographs total approximately 6.8 MB in source files; each is at most 177 KB, and Next Image still serves responsive sizes. Descriptive alternative text and dimensions are recorded in lib/website-media.mjs. Source, licence, export hash and processing evidence are recorded in docs/websites-photography-sources.json; original downloads remain private.

The salon page now uses the shared Websites layout, six buyer questions and its existing salon/beauty/barber search intent. Its price figures are kept on Pricing. This move does not add a new keyword-volume estimate. The sitemap contains 37 canonical URLs, including the hub and eleven detail pages, with a fixed actual modification date for this release. Retired Services addresses are excluded.

Verification: production build, 129 code/route/SEO checks and 47 active desktop/phone browser scenarios passed locally. Five device-specific scenarios were intentionally skipped. The photograph test checks the rendered image placements and asset hashes across every Websites page. Mobile speed remains a separate outstanding concern from the prior release; performance budgets were not weakened.
