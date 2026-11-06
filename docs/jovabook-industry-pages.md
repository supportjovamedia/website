# JovaBook industry landing pages

## Structure

The industry directory is `/industries`, linked from the shared footer. It groups 17 pages into Hair & beauty, Wellness, and Teaching & fitness. Each page links to related workflows. `/online-booking` describes the product feature and is also linked from the footer.

The five established URLs remain: salons-and-barbers, beauty-and-nails, tutors, personal-trainers, and clinics. The combined salon/barber and beauty/nail pages act as broader guides with links to the more specific pages.

New pages target salon booking software, barber booking software, nail salon booking software, spa booking software, medical spa appointment scheduling, spray tanning appointments, private Pilates sessions, mental health administrative scheduling, lash and brow appointments, massage appointments, private yoga sessions, and tattoo consultations. These are search-intent choices, not verified search-volume estimates.

## Page content and search signals

Pages lead with “Online booking software for…” and contain an industry-specific introduction, four detailed scheduling sections, product features, limitations, FAQs, plan information and a signup route. Each page has an individual title, description, canonical URL, social metadata, H1, WebPage schema linked to the established JovaBook software entity, and breadcrumbs outside the hero with matching JSON-LD. All canonical industry URLs and online booking appear in the sitemap. Numbered steps, example-menu chips and screenshot captions are removed.

Clinical pages do not claim healthcare compliance or clinical-record capabilities. Pilates and yoga cover private appointments, not group classes. Tanning covers appointments, not sunbed controls or package credits. These limits are visible on the relevant pages.

Reference: https://www.vagaro.com/en-gb/pro/salon-software

Google recommends useful content for people rather than many substantially similar keyword pages: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

No indexation, traffic or ranking improvement is guaranteed by publishing these pages. Use Search Console impressions and clicks, consented GA4 journeys, and database signups as separate measures after release.

## Images and request costs

Every detail page renders the same single dashboard image, using the same source URLs across all industries. The directory has no content images. Shared navigation/footer logos remain separate. There is no asset-directory fetch, preload loop, gallery carousel, remote image API or client-side image loader. Links in the new content explicitly disable Next prefetch.

`scripts/prepare-industry-media.mjs` processes only the explicit dashboard source and runs only when an editor changes artwork. It does not run at build time or on a visit. It creates WebP variants with metadata stripped, and a source manifest at `lib/jovabook-industry-media.json`.

A native picture element selects either the 640px or 1120px version. The hero loads eagerly. Filenames contain a SHA-256 content hash and are served with a one-year immutable browser cache. Moving between landing pages at the same image breakpoint reuses the same URL. Crossing a breakpoint can request the other variant. Changed artwork must receive a new hash; never overwrite an immutable URL with different bytes.

The dashboard variants are 11,536 and 25,928 bytes. These are precompressed exports served directly without Next image transformations. The fourteen superseded industry exports are removed from this feature branch; original artwork remains in its existing source locations for recovery and other pages. Existing unused files in public storage are not requested merely because they exist.

An initial visit, expired cache, cleared cache or new image URL still creates requests. This setup reduces unnecessary repeat requests; it cannot make hosting traffic free.

## Maintaining the pages

Edit page-specific long-form content in `lib/jovabook-industry-copy.mjs`, and the catalogue, product benefits and core FAQs in `lib/jovabook-industries.mjs`. Add a distinct, supported workflow before adding another industry. Keep plan prices aligned with the active offer. For a media change, run `node scripts/prepare-industry-media.mjs` and inspect the actual output, then commit the manifest and referenced exports together. Do not add a blanket image preloader. See `docs/jovabook-search-visibility-plan.md` for the search and answer-engine approach and release measurement.
