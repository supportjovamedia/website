# JovaBook search and answer-engine visibility

Reviewed 6 November 2026. This plan covers the industry landing pages in PR #170. It does not establish that the pages are published, indexed, ranked or cited.

## Objective

Help an appointment-business owner decide whether JovaBook fits their scheduling workflow, then make it straightforward to register. Measure search discovery, website visits, registrations and actual use as separate stages.

## Content approach

Each industry page has one main subject: online booking software for that type of business. Appointment scheduling, booking systems, calendars and booking links appear where they describe a real action or capability. The requested primary long-tail phrase appears six times across the opening, overview, website section, FAQs and plan introduction. That editorial frequency is not a ranking guarantee or a substitute for useful content. There is no hidden keyword list or metadata-keywords tag.

The title and H1 identify the product category and audience. The opening paragraph names JovaBook and explains what that business can do with it. Four industry-specific sections answer practical questions about service timing, availability, how clients book, and preparing the diary. The page also has supported product benefits, six to eight direct FAQ answers and accurate plan information. Rendered detail pages contain approximately 930 to 1,050 words. Word count describes the implementation, not a ranking threshold.

Industry distinctions matter. Barbers need to understand appointments alongside walk-ins; salons need clear service durations and the limits around processing stages; nail technicians need infills and removals described correctly. Pilates and yoga pages cover private appointments. Medical and mental-health pages explain general administrative scheduling and its limits, without claiming clinical records or healthcare certification.

Numbered process decorations, example-menu chips and screenshot captions are removed. Each page contains the dashboard, a relevant context photograph or mobile-booking view, calendar and service screenshots. The content does not claim that depicted booking totals or illustrative photographs are customer results. There are no invented testimonials, success statistics or comparison victories.

## Page ownership and overlap

The primary navigation is Home, About, Pricing, Blog, Contact. Industry pages are discovered through the shared footer's Booking by industry link, the directory and relevant related-page links. The directory is `/industries`, and each guide sits under `/industries/{slug}`. This keeps individual guides two links from a standard page without adding every industry to the header. Google's guidance asks for crawlable internal links; it does not require every page to be in the primary navigation. [Google link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

Vagaro uses a grouped Business Types dropdown as well as industry links in its footer. JovaBook keeps its simpler primary navigation and uses the footer/directory structure for now. [Vagaro reference](https://www.vagaro.com/en-gb/pro/salon-software).

| Page group | Main intent | Supporting questions |
| --- | --- | --- |
| Hair salons | Online booking software for hair salons | Stylist calendars, service lengths, deposits, existing website |
| Barbers | Online booking software for barbers | Direct bookings, walk-ins, barber selection, booking app downloads |
| Nail salons | Online booking software for nail salons | Infills, removals, nail art timing, technician diaries |
| Lash and brow artists | Online booking software for lash and brow artists | Full sets, infills, patch-test limits, Instagram booking |
| Spas and massage | Appointment scheduling for individual treatments | Therapist time, treatment durations, room allocation limits |
| Tanning | Online booking for spray tan appointments | Fixed appointments, mobile travel, equipment and package limits |
| Pilates, yoga and personal training | Booking private sessions | Instructor availability, individual appointments, class and membership limits |
| Tutors | Booking individual lessons | Lesson lengths, parent/student booking, tutor calendars |
| Medical spas, clinics and mental health | Administrative appointment scheduling | Practitioner diaries, clinical-system boundaries, adoption requirements |
| Tattoo artists | Consultation and agreed-session booking | Custom quotes, artist diaries, consent and identity boundaries |
| Online booking | How JovaBook online appointment booking works | Booking link, browser use, website embedding, plan choice |

These are intent choices, not measured search-volume estimates. The existing combined salon/barber and beauty/nail pages remain broader guides. They link to the specific workflows instead of presenting identical content under competing titles. After release, use Search Console query/page evidence to decide whether any overlap warrants consolidation or different emphasis.

## Search and AI-answer foundations implemented

The pages use server-rendered text so the main explanation does not depend on opening a widget or running a carousel. Each has an individual search title and description, a self-referencing canonical and product-specific social metadata using the existing static JovaBook share image. Search snippets and large image previews are explicitly permitted in page metadata. Preview deployment noindex headers remain in place. The industry directory, footer and related links provide crawlable routes to the content. Canonical pages appear in the sitemap with a real content-change date.

WebPage structured data identifies the page and connects it to the existing JovaBook WebApplication entity and JovaMedia publisher. Its primary image identifies the actual dashboard image. Breadcrumb structured data matches the visible breadcrumbs outside the hero. It describes the software pages, not a collection of fictional local businesses. FAQs remain visible, expandable HTML. This change does not claim FAQ rich-result eligibility or an AI ranking benefit from a particular schema type.

The repository's robots configuration already allows public crawling and points to the sitemap. A focused production check on 6 November returned HTTP 200 for `/robots.txt`, with `User-Agent: *`, `Allow: /` and the correct sitemap. The existing `/industries/salons-and-barbers` page returned HTTP 200 with no X-Robots-Tag or meta noindex restriction. This confirms normal public HTTP access for those resources, not successful crawling from every provider's authenticated crawler IP. New PR pages must still be checked after release.

| Provider | Relevant search access | Current robots scope |
| --- | --- | --- |
| Google Search and its AI features | Googlebot | Allowed by the public wildcard rule |
| Bing and Copilot discovery | Bingbot | Allowed by the public wildcard rule |
| ChatGPT Search | OAI-SearchBot | Allowed by the public wildcard rule |
| Claude search | Claude-SearchBot; Claude-User for user-directed retrieval | Allowed by the public wildcard rule |

Search and training crawler controls are separate. No training preference was changed in this task. OpenAI documents OAI-SearchBot separately from GPTBot; Anthropic documents Claude-SearchBot and Claude-User separately from ClaudeBot. See [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) and [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler). A robots allowance alone does not prove indexation, provider-IP access or citation eligibility in every product.

Google says its existing SEO fundamentals apply to AI Overviews and AI Mode. A page must be indexed and eligible for a search snippet; inclusion is not guaranteed. It does not require special AI text files or special schema. See [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

Bing describes discoverability, focused content, clear structure and accurate information as foundations for Bing, Copilot and grounding eligibility. See [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a).

## Asset and hosting costs

All 18 detail pages share the same dashboard, calendar and services source URLs, plus a context photograph or mobile-booking product view. There are four content images per page; three are lazy-loaded below the hero. The dashboard phone and desktop variants remain 11,536 and 25,928 bytes. All individual exports are 6,116 to 40,470 bytes. A picture element selects the appropriate version. The files are compressed before deployment and served directly, with no runtime image-transformation service.

Hashed filenames have a one-year immutable cache. At the same breakpoint, navigating to another industry page can reuse the browser's existing image instead of requesting a page-specific copy. A first visit, a new browser, a cleared cache or the other breakpoint can still require a request. See [MDN: immutable caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#immutable).

Only the chosen four images appear in a detail page's content markup. Original source artwork is retained in its existing locations. There is no asset-directory download script, image preloader, new analytics beacon, client-side polling, paid SEO service or new automation in this change. Content links disable automatic Next prefetch. More images can mean up to three additional below-hero image downloads on an initial complete read, with subsequent reuse subject to the browser cache.

## Release and measurement

| Stage | What to verify | What it establishes |
| --- | --- | --- |
| Review | Actual desktop and phone layouts, headings, facts, forms of wording and links | The implementation matches the brief |
| Release | Approved merge and successful production deployment | The reviewed content is published |
| Discovery | Production status, canonical, robots, sitemap and selected URL inspections | Technical accessibility and discovery evidence |
| Indexing | Search Console and Bing indexing status | Whether a search engine has indexed a URL |
| Search visibility | Query/page impressions, positions and clicks | Search exposure and visits, not registrations |
| AI visibility | Bing AI Performance citations where available; genuine referring traffic | Citation activity and visits, measured separately |
| Acquisition | Consented GA4 registration journey and database registrations | Visitor progression and actual accounts |
| Activation | A real business publishes its booking link and starts receiving bookings | Product use beyond account creation |

Submit the updated sitemap and request inspection of representative new pages after the content is approved and live. Do not submit unpublished preview URLs or add a new crawler that repeatedly requests every page. Inspect the main commercial pages first, then review indexing and query evidence before expanding the catalogue further.

Review query/page results after there has been enough time and exposure to observe a pattern. Use questions appearing in search data and real customer conversations to refine content. Do not infer failure from zero early impressions or infer sales from a citation count. Google reports its AI features within overall Web search performance, while Bing provides an AI Performance view for its supported surfaces. [Google measurement guidance](https://developers.google.com/search/docs/appearance/ai-features), [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c).

## Evidence that can improve the next iteration

Use genuine customer onboarding questions, real product screenshots and approved customer examples. A useful case study would name the type of business, explain its appointment workflow, show the features it used and include a supportable result. Obtain permission for customer names, quotes and account imagery before publication. Do not turn test businesses or demo appointment totals into customer proof.

Maintain the pages when features, pricing or limits actually change. Keep the same product names and plan facts across the homepage, pricing, help content and industry pages. Add a new industry only when the product supports a distinct workflow and there is something useful to explain.

## Source notes

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): length alone does not determine ranking; excessive keyword repetition is discouraged.
- [Google structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must accurately represent the page.
- The implementation, screenshots and local checks establish preparation, not a guaranteed ranking, indexation date, AI citation or signup result.
