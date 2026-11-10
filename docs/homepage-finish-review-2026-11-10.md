# Homepage finish, 10 November 2026

## Scope

This feature branch contains the homepage and its shared marketing presentation. Portal authentication, record pagination, billing API and database migrations are excluded. It is based on origin/main a62ee13, which already includes PR #194.

## Changes

- Replace portal illustrations with 28 current, versioned, double-resolution local demo captures. Keep source originals in the separate local capture archive. Use dedicated MacBook Air 13-inch and iPhone 17 Pro Max captures with proportional devices and aligned bottoms.
- Keep the approved small-business H1, update matching search/share metadata and versioned 1200x630 share artwork. Retain canonical, one H1, existing JSON-LD and /jovabook redirect.
- Restore the previous navigation with yellow active destination, per latest feedback. Give the desktop laptop clear space below the header.
- Compact Why choose copy, use four desktop cards, retain the phone carousel. Improve product captions and spacing, center the desktop caption and remove screenshot enlargement. Restore matching arrow controls where the upper carousels overflow. Keep all four screenshot choices and six dashboard designs.
- Use separate full-width white/neutral-grey bands with subtle borders, balanced section padding and centered 1160px desktop content. Keep phone/tablet gutters consistent. Apply this boundary system across the earlier film, Why choose, product/workspace, industries and booking demo too.
- Rebuild customer stories to the supplied black/yellow reference. Preserve all five original quotes. Use supplied industry categories, registration icons and fallback. Add a 180ms entry transition with stable height and reduced-motion support, touch swipes and mouse dragging; no autoplay.
- Keep stories directly before pricing, then chat, referrals, FAQs, final signup and checklist. Correct the plans anchor so Start free reaches pricing after the reorder.
- Match chat/referral references. Chat loads the existing Crisp integration only after a click. Keep the availability wording honest. Referral terms sit below the whole card; program eligibility remains unchanged.
- Keep pricing and billing rules unchanged. Show the Solo description in both billing modes, shorten payment notes, and improve annual labels, rounded Save 20% badge, equal desktop plan heights, centered Team controls and compact readable seat grouping without an enclosing frame.
- Display six FAQs initially and allow all ten via Show more. Exclude hidden rows when selecting the active red outline.
- Give the Google checklist a readable vertical form and breathing room. Keep form delivery and error recovery unchanged. Improve footer icons and cookie control presentation.
- Generate calculator SSR and enhanced results from one default model. Align desktop summaries, compact the phone selector, retain editable assumptions and vendor links. Show Fresha, Treatwell, Booksy and Squarespace only; remove Acuity from the homepage comparison. Use green for positive annual/monthly savings, with annual savings primary. Keep longer context in a collapsed Comparison details panel inside the calculator.
- Cache hashed screenshot assets immutably for one year; keep the manifest revalidated. No added background refresh or FX request.

## Validation

The final frozen-source webpack production build passed, compiled in 11.3 seconds and generated all 141 static pages. Existing Edge Runtime deprecation warnings remain unchanged.

One combined focused invocation passed 46/46 tests with no failures or skips. Coverage includes calculator SSR/runtime and invalid inputs, four product tabs, booking demo, website previews, billing/seat controls, FAQ six-to-ten reveal and active outline, original customer quotes, touch/mouse gestures, keyboard controls, reduced motion, local Crisp guard, signup error recovery, screenshot preparation and served share metadata. The full-page integration verified all 18 DOM bands at 360, 390, 768, 1440 and 1920px, with no horizontal overflow or unintended section gaps.

Targeted ESLint passed for all changed JSX/client modules. git diff --check passed. The served homepage returned 200, contained one H1, retained the homepage canonical and parsed existing WebPage, WebApplication/offers, FAQ, video, Organisation and WebSite JSON-LD. /jovabook returned a permanent 308 redirect to /.

All 28 screenshot exports matched their hashes and contained no EXIF/XMP/IPTC or AI-tool/provenance markers. The new 1200x630 share PNG passed the metadata scan too. Original captures remain separately archived for recovery.

Logs are kept locally in output/homepage-release-build-20261110.log and output/homepage-release-focused-tests-20261110.log. This is a focused homepage gate, not a claim that the entire unrelated backend test suite passes. Checks ran only against localhost or isolated fixtures. No production page crawl, live payment, email delivery, real booking or Crisp message was submitted.

## Factual limits

Existing testimonials are retained verbatim; no ratings, business URLs, results or case studies were invented. Any future customer evidence needs the verified business identity, source/case-study URL and permission.

Acuity research is retained in the source notes, but Acuity is absent from the homepage comparison. Booksy/Treatwell official fees were checked on 10 November. Fresha/Squarespace GBP presets retain the existing 7 November basis; the research environment did not establish a fresh Fresha GBP localization. See calculator-pricing-sources-2026-11-10.md. Figures are editable illustrations, not guaranteed savings.

## Deferred work

The wider CDN investigation and unmerged portal/data work remain separate. No hosted migrations, backend rollout, direct default-branch push, merge or production deployment belong to this homepage change.
