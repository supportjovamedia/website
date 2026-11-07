# JovaBook landing page and workspace styles

The homepage follows the approved local design: calendar-led hero, demo, reasons to choose JovaBook, industry examples, booking tools, included website, dashboard styles, savings calculator, pricing, support and customer quotes.

- Keep the existing site navigation, metadata, structured data and shared footer.
- Three intermediate Start free links follow the demo, booking preview and website examples.
- Pricing links open signup with the chosen plan, billing cadence and Team seat count.
- Booking and FAQs render on the server. Carousels and calculator enhance after hydration.
- New design CSS is scoped to the landing page. Existing billing and provider logic is unchanged.
- Six saved dashboard styles: Classic, Liquid Glass, Graphite, Editorial, Porcelain and Studio. Legacy theme IDs resolve to their corresponding new style.

## Verification

Local production compile passed with Next.js 16.4.3 using webpack. The linked local dependency directory prevents Turbopack's hermetic resolver from seeing Next.js, so webpack was used locally without changing the project's build command.

Bounded manual inspection at 1280, 390 and 320 pixels found no horizontal page overflow. Checked menu open/close, reason-card pagination, interactive booking steps, calculator selection, testimonial wraparound from five to one, single footer and pricing selection. Three Team seats with annual billing show £29.60 monthly equivalent and carry `plan=premium&cadence=annual&seats=3` into signup. No purchase was made. No live regression, performance or crawl tests were run.

The Vercel Usage dashboard showed 921,371 CDN requests for Oct 8, 11:00 through Nov 7, 11:00, below the owner's 940,000 release cutoff. This reading was taken before the release. No public-site verification visits were made.

## Benefit-card photography

The two rejected generated open-sign and coin pictures were replaced with stock photography:

- Weekly planner: cottonbro studio, https://www.pexels.com/photo/pen-on-top-of-a-planner-7439132/
- Phone payment: Kaboompics, https://www.pexels.com/photo/close-up-shot-of-a-person-holding-a-credit-card-and-a-smartphone-5717947/

Usage follows the Pexels licence at https://www.pexels.com/license/. These photographs illustrate booking and payment, with no endorsement implied. The included website and tailored-business pictures remain AI-assisted illustrations from the approved local design. Delivery copies are resized WebP files; EXIF, XMP, IPTC and C2PA markers were checked and absent. Original sources are retained in the local design folder.
