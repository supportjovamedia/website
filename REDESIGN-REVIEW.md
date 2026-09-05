# JovaMedia v3 — design-pack implementation

Status: built and locally verified. Not deployed or pushed.

Production-mode local preview: http://localhost:3102/
Development preview: http://localhost:3100/
These replace the earlier, restrained redesign preview for this task.

## Implemented from the supplied pack

- Rebuilt the homepage to follow the supplied desktop upper/lower and mobile references, with the original section order and supplied copy.
- Retained the original JOVA logo assets in header/footer, existing navigation, all 20 service pages, legal routes, terms alias, contact email and enquiry-draft workflow.
- Applied Porcelain #FDFFFC, Baltic Blue #235789, Flag Red #C1292E, Bright Gold #F1D302 and Black #020100.
- Added locally hosted Plus Jakarta Sans Latin variable WOFF2, with its OFL licence, font-display swap and Arial fallback.
- Added the campaign-led hero, red accent stroke, rounded imagery, pill buttons, six service cards, two project cards, four approach steps, blue values section and red contact CTA. Removed the old four-word hero strip.
- Applied the new typography, palette, rounded components and controls to the existing inner pages.
- Created four new AI-generated conceptual image assets: hero campaign portrait, unbranded red can, editorial portrait and creative-workspace still life. Optimized WebP sizes: 108 KB, 57 KB, 68 KB and 126 KB respectively.
- Used a labelled workspace still life in the partnership section because no real team photography was supplied. Generated people are not represented as JovaMedia staff or clients.
- Updated the social-sharing palette and retained domain, deployment architecture, analytics gate and enquiry behaviour.

## Inspectable concept work

### A bolder brand direction

Route: /work/brand-direction
Prototype: /work/brand-direction/landing

Includes the creative brief, audience assumptions, constraints, art direction, colour references, a 1600 × 1200 campaign hero, portrait poster, three social compositions, two implemented layout options and a responsive landing concept. Download links serve actual PNG artwork. The discovery action leads to the concept story, with no purchase flow.

### A more considered experience

Route: /work/editorial-experience
Prototype: /work/editorial-experience/prototype

Includes the sitemap, reading flow, home/article wireframes, responsive editorial homepage, topic filters, About page and three article routes. Articles include introductions, body content, accessible image descriptions, captions and related reading. All are labelled sample editorial content. No newsletter collection, real-person bylines or fabricated interview quotes.

Both studies remain explicitly self-initiated and fictional. No client commission, commercial launch, performance uplift or reader research is claimed. Prototype pages use noindex; the two study pages are included in the sitemap.

## Verification completed

- Production build: passed, 46 generated entries including the added concept routes and sample articles.
- ESLint: passed, no errors or warnings.
- Integration tests: 8 passed. They cover 30 sitemap pages, canonical URLs, headings, descriptions, 404s, terms alias, contact endpoint, robots/social image, prototype routes and real campaign downloads.
- Automated WCAG A/AA checks: zero violations detected on 11 representative pages, including both studies and prototypes. This does not replace a full manual accessibility audit.
- Responsive checks: homepage, services, work, contact, brand study, editorial homepage and article checked at 320, 390, 768, 1024 and 1440 pixels. No horizontal overflow or broken images found.
- Topic filter → article → related article flow passed.
- Mobile menu open, Escape close and route navigation passed.
- Enquiry draft review and recipient passed. No message was sent.
- Production browser preview: no console or page errors in the final checked pages.
- Local unthrottled desktop observation: LCP approximately 0.64 seconds and CLS approximately 0.00004. These are local observations, not live field performance or a Lighthouse score.
- Four-page A4 homepage PDF exported, rendered and visually inspected. Images, coloured sections and footer remain visible. Print uses a compact composition rather than squeezing a tall webpage onto one sheet.

## Important preserved details

The enquiry form still prepares an email draft. No mail provider has been added. The social links still point to platform homepages, pending real profile URLs. Production deployment still requires preview approval.

## Main files changed or added

- Homepage: app/page.js, app/home.module.css
- Shared design/font: app/globals.css, app/direction.css, app/layout.js, app/fonts/
- Artwork components: components/Arrow.js, components/WorkStudy.js
- Concepts: app/work/page.js, app/work/brand-direction/, app/work/editorial-experience/
- Editorial behaviour/content: components/EditorialPrototype.js, lib/editorial.js
- Assets: public/campaign/
- Metadata: app/sitemap.js, app/opengraph-image.js
- Tests: tests/site.test.mjs, tests/concepts.test.mjs

## Run and check

From the supplied jovamedia source folder:

```sh
npm ci
npm run dev -- --port 3100
```

For production-mode preview:

```sh
npm run build
npm run start -- --port 3102
```

Run `npm run lint` and `npm test` with the dev server at port 3100. To test another local port, set TEST_URL to its URL.

Source archive excludes node_modules, build output, Git internals and private environment files. It includes the original repository content, new assets, font licence and tests.
