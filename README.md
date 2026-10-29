# JovaMedia website

## Essential booking prototype

The standalone source for [book.jovamedia.com](https://book.jovamedia.com/) is in [booking-demo](booking-demo/README.md). Run it separately with `cd booking-demo` and `npm run dev`. It uses browser-local example data; login, payments, email and SMS are simulated. This folder is separate from the existing Next.js booking backend.

## Run locally

Extract this project into a new folder, open it in VS Code, and use Node.js 20.9 or newer.

    npm ci
    npm run dev

Open http://localhost:3000.

Production check:

    npm run build
    npm start

## Search and content work

The homepage presents website design for small businesses across the UK, with London as the studio base. The existing website-design service targets London; the salon website service serves the UK. No Harrow-only page is included.

Six researched guides support the commercial pages. Qaiser Watches is a delivered project, with owner-supplied client feedback presented as a paraphrase. Portfolio concepts retain their concept status. Prices come from the maintained product catalogue, and articles use truthful dates and named sources.

See [the organic search audit](docs/organic-search-audit.md) for the live baseline, keyword strategy, release checks, indexing follow-up and account-access limitations. [The editorial brief](docs/editorial-brief.md) records the writing and source-verification approach.

## Functionality and limits

Contact, quote, newsletter, checkout and booking delivery depend on their configured providers. Unconfigured handlers must report unavailable instead of pretending to deliver. Do not send fake enquiries, chat messages, newsletters, payments or bookings while testing production.

Marketing measurement is consent-aware and restricted to the production apex/www hostname. Local and deployment-preview visits do not initialise production marketing tags. The business contact details are maintained in `lib/business-contact.mjs`.

The phone service showcase uses ordinary scrolling, with a static fallback on short screens and for reduced-motion preferences. Below-fold imagery is lazy-loaded. Image source records live beside the relevant public assets; preparation scripts retain recovery originals outside the checkout.

## Verification

Run the checks appropriate to the change:

    npm test
    npm run lint
    npm run build
    npm run regression

Some booking-demo integration tests require a configured Supabase environment. The read-only regression suite uses injected delivery transports and never sends real customer submissions. See [release checks](docs/RELEASE-CHECKS.md). The PR workflow runs the browser regression on desktop and phone viewports.

The local public-page audit can run against a development server:

    node scripts/audit-public-site.mjs

Set `TEST_URL` to a local origin when using a port other than 4326. The audit checks sitemap routes, image attributes, internal destinations and visible content. It is not a substitute for production field performance, Search Console indexing or visual browser review.

## Main files

- `components/StudioHome.js` and `components/DaybreakHero.js`: homepage content and motion.
- `lib/insights.mjs`: article content, sources and article schema helpers.
- `app/insights`: guide index, article routes and share images.
- `lib/service-catalogue.js` and `lib/products.mjs`: service and package information.
- `lib/marketing-analytics.mjs`: consent, safe event fields and public-route boundaries.
- `app/sitemap.js` and `lib/seo.js`: discovery and metadata.

## Image provenance

The architectural image was generated with the built-in image-generation tool and inspected. Prompt: "Original portrait architectural photograph of an elegant sweeping modern glass office facade, viewed upward at a close oblique angle; charcoal and cool blue-grey glass, crisp linear mullions, soft overcast pale sky, believable continuous editorial photography; no recognisable landmark, brands, text, yellow discs, graphics, circles or arrows."

The logo and favicons are the assets supplied with your original project. The ZIP excludes unused legacy photos, the alternate redesign's imagery, installed dependencies, build output and old Git history.
