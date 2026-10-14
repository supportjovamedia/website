# JovaMedia organic search audit

JovaMedia already has working search foundations, but very little search visibility. The immediate opportunity is to give potential clients clearer service information, useful answers and real evidence of delivered work. The changes in this branch support that goal. Publication follows review and merge; preview pages should stay outside search indexes.

## Current evidence

Checked on 14 October 2026 using the production website, Google Search Console and the connected reporting tools.

| Area | Finding | Implication |
| --- | --- | --- |
| Google Search Console | Domain property `sc-domain:jovamedia.com` is connected. The settled period 14 September to 11 October recorded 85 impressions and 10 clicks, with average position 19.3. | Search traffic is small, rather than zero. The average combines different pages and queries; it is not a ranking for a target keyword. |
| Search queries | The visible query rows included `jova` and `jova.media`. Search Console hides some queries. | There is not enough visible data to establish a dependable stream of relevant, non-branded visitors. |
| Website design | `/services/web-design` recorded 8 impressions and no clicks in the selected period. | Improve the page's relevance and proof, then measure its own queries and clicks. |
| Indexing | Fresh URL inspections passed for 13 of the 18 current sitemap URLs. Five were reported as unknown to Google: `/work`, `/work/brand-direction`, `/get-a-quote`, `/pricing` and `/services/system-modernization`. | These priority URLs need release checks and recrawl requests. A sitemap does not prove indexing. |
| Sitemap and crawling | The production sitemap returned 200 and its Search Console submission was successful. All 18 listed URLs returned 200. Robots permits crawling. | Keep the working foundation and add the completed pages. There is no reason to replace the sitemap system. |
| Canonicals | Live pages declared the appropriate canonical URLs. Some Google inspection records reflected older crawls. | Recheck Google's selected canonical after recrawling instead of treating an old record as a current HTML fault. |
| Breadcrumbs | Search Console showed two valid breadcrumb items and no invalid items. | Breadcrumbs already work. They are navigation links such as Home / Services / Website design, with matching structured data. |
| External links | Search Console's sampled report showed Nextdoor links. Qaiser Watches carries a live, branded link to JovaMedia. | There is some external recognition, but the sampled report is not a complete backlink count. |
| Analytics | Clarity's small sample included localhost and deployment-preview visits. | Exclude those hosts from production measurement before judging real visitor behaviour. |
| Bing | The connected reporting tool had no Bing API configuration. | Confirm Bing Webmaster Tools access separately. This result does not establish whether a Bing account already exists. |

Indexing means a search engine has stored a page and can consider it for results. Ranking is the position it chooses for a particular search. An indexed page can still receive no impressions, and a recrawl request guarantees neither indexing nor a position. See [Google's recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Changes in this branch

| Change | Purpose |
| --- | --- |
| UK-focused homepage heading, title and description, with London as the studio base | Explain the service and market immediately. |
| More specific website design page | Explain package scope, booking options, process, ownership and separate costs. |
| Dedicated salon website service page | Give salon and lash-business buyers a relevant commercial destination. |
| Clearer pricing introduction and questions | Help buyers compare the existing £350, £550 and £2,000 starting packages without changing the catalogue. |
| Qaiser Watches case study and homepage project section | Show an actual delivered project and the client feedback supplied by the owner. The feedback is a paraphrase, not an invented quotation or rating. |
| Six completed articles and an indexable Insights section | Answer specific buyer questions and connect that information to relevant services. |
| Article metadata, visible publication dates, BlogPosting data and breadcrumbs | Keep the page identity, visible information and machine-readable facts consistent. |
| Expanded sitemap and relevant internal links | Help people and crawlers reach the new content. |
| Production-host analytics check and curated article fragments | Keep local tests out of production measurement while preserving privacy on article navigation. |
| Varied photography, project imagery and a cost illustration | Make the imagery relevant to each subject. Decorative eyebrows, arrow flourishes and counters have been removed from the edited public pages. |

The articles use their actual publication date, 14 October 2026. They have not been backdated. No client sales uplift, traffic increase or ranking improvement is attributed to these changes before measurement.

## Target searches

These are candidate targets based on the offer, search intent and a current result review. No keyword-volume subscription was used, so monthly search volumes and ranking difficulty are not claimed.

| Page | Primary intent and candidate searches |
| --- | --- |
| Homepage | JovaMedia; small business website design UK |
| `/services/web-design` | Small business website design London; website redesign London |
| `/services/salon-website-design` | Salon website design UK; beauty salon website design; website design for lash technicians; salon booking website |
| `/pricing` | Small business website prices UK; business website cost; landing page price |
| `/work/qaiser-watches` | Qaiser Watches website design; JovaMedia website portfolio |
| Booking fees article | Salon booking platform fees; Booksy versus own website; Treatwell commission and direct booking |
| Website cost article | Small business website cost UK; what is included in a website quote |
| Lash website article | Website for lash technicians; lash business booking website |
| Salon channels article | Does a salon need a website with Instagram or Booksy? |
| Small business article | Does a small business need a website? |
| Launch checklist | Small business website launch checklist |

Keep the homepage UK-wide and describe London as the studio base. The existing website-design service page targets London. Harrow is a possible later opportunity, rather than a new page in this release. Do not create Harrow, Camden, Romford and Southall copies of the same page. A separate local page becomes useful when there is distinct local evidence, work, customer information or a service difference to explain. Google's [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) address doorway pages and manipulative links.

The current results for salon website design already include agencies with dedicated service pages and published prices. This is a competitive query, not an undiscovered shortcut. JovaMedia can be more useful by showing actual work, explaining the booking choices honestly and making the scope easy to compare. Broad `website design London` visibility is a longer-term outcome.

## Publication and indexing

- Review and merge the feature PR through the normal workflow. Do not index a protected or noindex preview deployment.
- Check the production homepage, website service, salon service, pricing, work, case study and six article URLs for 200 responses, appropriate canonicals and one main heading.
- Confirm the production sitemap contains 27 unique public URLs, including the Insights index and all six articles.
- Submit `https://www.jovamedia.com/sitemap.xml` in the existing Search Console property if needed. The connected reporting scope is read-only, so use the signed-in Search Console interface for submission.
- Inspect priority production URLs and request indexing once after release. Start with the website service, salon service, pricing, work and Qaiser case study, then the articles. Allow Google to process the requests.
- Check Google's selected canonicals and indexing status again in subsequent settled reports. Do not repeatedly submit the same URLs to try to speed crawling up.
- Confirm Bing Webmaster Tools access and submit the production sitemap there. Keep the same business identity and canonical domain.

## Google and AI search

The useful work overlaps: crawlable and indexable pages, descriptive titles, readable text, clear business identity, real evidence and links from credible sources. Structured data must describe the visible content. Google states that AI Overviews and AI Mode do not require special AI files or a separate schema: [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features).

Keep search crawlers permitted, including OAI-SearchBot where ChatGPT Search visibility is wanted. GPTBot controls a separate training-use choice. Do not present an `llms.txt` file, extra schema or AI wording as a ranking guarantee. Measure actual citations and referral visits when data is available.

## Organic client acquisition

The first commercial goal is relevant enquiries. More articles are useful only when they answer a real buyer question or explain a service that JovaMedia can deliver.

| Next action | Practical approach | Expected contribution |
| --- | --- | --- |
| Make the existing proof easy to find | Use the Qaiser case study in business profiles and in relevant sales conversations. Keep its existing branded website credit. | Gives buyers something concrete to assess and creates a route back to the studio. |
| Ask for genuine feedback | Request a review or an approved exact testimonial from Qaiser when ready. Confirm the business profile is eligible before asking for a Google review. | Adds independent trust. Do not turn the current paraphrase into a direct quote. |
| Follow up the referral offer | Give Qaiser a short introduction and the case-study link to share when he chooses. Contact referred businesses only when authorised. | Reaches relevant watch-industry prospects through a real relationship. |
| Develop useful partnerships | Approach photographers, branding specialists, local business networks and beauty educators with a relevant collaboration idea. | Creates introductions and potential editorial mentions. A link should be a consequence of useful work. |
| Keep business profiles consistent | Use JovaMedia, the full website URL, the London base and UK-wide coverage, and the correct business contact details. | Helps visitors and search systems identify the same UK business. |
| Use a Google Business Profile if eligible | Check in-person customer contact and address rules. Do not create a fake office or imply a location the business does not have. | Supports local discovery where eligible. See [Google's eligibility rules](https://support.google.com/business/answer/13763036). |
| Share a guide where it answers a question | Use dedicated business channels and relevant communities that allow it. Lead with the useful answer. | Can bring the first relevant readers before search visibility grows. |
| Review enquiries before expanding content | Record which page and topic started the conversation, then answer repeated buyer questions. | Builds a smaller, more relevant content library. |

Avoid paid link packages, mass directories, fabricated reviews and repetitive keyword-heavy footer links. Do not post through Abdul's personal or employer-visible accounts.

## Measurement and follow-up

GA4 reporting was not readable through the connected tool because the business account had no Google Analytics OAuth scope. This does not establish that GA4 is absent from the website. Connect the actual business property, then verify consented enquiry, quote, WhatsApp and call events and mark the appropriate genuine lead events as key events. Do not manufacture test customer submissions in production.

The CrUX reporting connector had no API configuration, so real production LCP, INP and CLS were not verified. The selected five hero image files fell from 3,204,710 bytes to 282,346 bytes after WebP export. That reduction describes those assets, not a page-speed percentage or a Core Web Vitals pass. Production field and lab checks remain on the release checklist.

The main navigation has five entries. Insights is linked in the footer and through relevant homepage, service and article sections. Google needs crawlable links and a useful hierarchy; it does not require every article in the primary navigation. See [Google's link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

The weekly review is scheduled for Monday at 09:00 in the app's local timezone, with a monthly report on the first Monday. It should stay quiet when nothing material has changed and report meaningful growth, newly indexed priority content, material failures or a decision requiring Abdul. Compare equivalent settled 28-day periods, inspect the actual query and page rows, and separate clicks from completed enquiries.

The local monitoring baseline is stored in the workspace under `output/seo`. It includes the audit period and priority URLs. Sumera remains a follow-up: confirm the new website, publication permission and useful project details before adding a case study.

## Verification

The production build passed, including the article share-image routes. Their file tracing is scoped to the required asset folders. Changed application files pass ESLint. A local crawl checked all 27 sitemap pages, 38 internal destinations and 54 image URLs with no reported errors. Browser review covers narrow phones, tablet and desktop layouts, calculator states, enquiry navigation, native FAQ keyboard operation and scroll progress. The phone showcase falls back to normal flow on short screens; the looping hero has a pause control.

The targeted local runs passed 29 SEO, route, content, calculator and privacy checks, and 50 delivery-handler, privacy, export and consent checks, with some overlap between the runs. The refreshed homepage capture passes its source-freshness check. The PR workflow also exercises the browser journeys on phone and desktop, including panel fit, short-screen fallback and FAQ progress after expansion.

Two unrelated booking-demo integration tests in the full repository suite require a configured Supabase deployment; this isolated SEO checkout has no booking credentials. The existing booking preview also has pre-existing React lint errors. Those are not represented as passing SEO validation. Production form delivery, field performance and search indexing remain separate post-release checks. Consult the PR checks and the workspace `output/seo` evidence for the final results.
