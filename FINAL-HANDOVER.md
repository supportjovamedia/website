> Latest update: see SEO-HANDOVER.md for the SEO improvements and right-aligned mobile menu.

# JovaMedia — final website handover

Prepared 5 September 2026. This is the latest version and supersedes the earlier v3 source ZIP and brand-kit website snapshot.

## Final design

- The hero has one primary action: **Start a project**. The extra Explore our work button is removed.
- Calls to action are black, with no visible arrow icons. The mobile header retains its original left logo / right menu arrangement.
- Capabilities use clean numbered markers instead of pictorial icons. All six capabilities and their existing links remain.
- All six homepage section labels use one size, weight, line height and letter spacing. Main section headings share one responsive size at each breakpoint.
- Mobile marketing copy, buttons, cards and footer content are centred. Forms, legal copy, article bodies and structured project details retain readable alignment.
- A single spacing system controls section breathing room. Hero, capabilities, approach and the final CTA use porcelain; partnership and concept work use soft grey `#F5F7F3`; Why JovaMedia remains Baltic blue `#235789`.
- Services use two columns on ordinary phones and a single column below 360px. Approach and value cards stack. The How we work action follows the approach steps on mobile.
- The hero uses a controlled responsive crop. Existing campaign artwork, original logos, font, routes and content structure are retained.

The mobile composition was informed by the centred headings, copy and primary action on [PayPal UK](https://www.paypal.com/uk/home). JovaMedia's own brand assets and content remain in use.

## Files changed in this final refinement

- `app/page.js`: hero CTA, simpler capability markers, approach action reading order.
- `app/home.module.css`: consolidated homepage styles, responsive alignment, shared type scale, spacing, image crop and print layout.
- `app/direction.css`: centred shared mobile marketing sections and footer.

Earlier approved changes in the source also cover the global layout, navigation behaviour, concept-study routes, assets and font setup. The original GitHub/Vercel deployment architecture is retained.

## Verification

- Production build: passed, 46 generated route entries.
- ESLint: passed, no warnings or errors.
- Existing automated suite: all 8 tests passed, including sitemap/canonical routes, unknown-route handling, campaign downloads and contact API behaviour.
- Browser checks: 11 representative pages with no automated WCAG A/AA violations and no console/page errors; seven routes checked at five viewport widths without overflow or broken images.
- Final homepage checks: 320, 375, 390, 430, 700, 768, 1024, 1440 and 1920px. Consistent section labels/headings, one hero CTA, centred mobile headings, black buttons without visible arrows, and no horizontal overflow.
- Mobile menu open, Escape and navigation passed. Editorial topic filter, article navigation and related story links passed.
- Enquiry review produced the correct email draft; nothing was sent.
- Desktop/mobile screenshots and the four-page A4 print preview were visually reviewed.

## Run the website

Extract the ZIP into a folder. The root contains `package.json`.

```sh
npm ci
npm run build
npm run start -- --port 3100
```

Open `http://localhost:3100/`. For editing, use `npm run dev -- --port 3100` instead of the last command.

The ZIP excludes `node_modules`, `.next`, Git internals and private environment files. `.env.example`, lockfile, source, font licence and assets are included. Use the existing project's deployment settings and existing private environment variables when publishing.

## Existing functionality to be aware of

The contact form prepares an email draft to `support.jovamedia@gmail.com`; the visitor sends it from their email app. A direct email delivery provider is not configured, and the API correctly returns an unavailable response. Social links are the existing platform links. Campaign and editorial portfolio examples remain clearly labelled self-initiated concepts, with no invented client outcomes.

No production deployment, Git push or domain change was performed. The local preview is for final approval before publishing.
