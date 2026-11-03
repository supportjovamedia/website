# JovaBook sales-page work queue

## Marketing release checkpoint, 3 November 2026

This section records the current marketing release; the dated app/payment history below is preserved and is not a current production status report.

- [x] Approved Wealthsimple direction, ManyPixels closing CTA, shared JovaMedia navigation and Products catalogue.
- [x] Products categories: JovaBook, three existing website packages, and the three chosen services. Website and Webcare amounts unchanged.
- [x] JovaBook prices, features and trial destinations shared between `/pricing` and `/jovabook`.
- [x] Actual mobile/desktop interactions at 320 through 1920px, no document overflow or browser errors. Separate pricing buttons aligned and phone cards stacked.
- [x] Latest upstream SMS consent and commission changes retained through merge of origin/main into this feature branch.
- [x] All 43 sitemap pages return 200, have canonical URLs and descriptions of 100 to 160 characters, and remain indexable. No broken or redirecting internal links found in the rendered marketing crawl.
- [x] Missing salon article hero replaced with an existing relevant photograph. Oversized PNG previews replaced with WebP, full uncropped business-site preview reduced from 1.84MB to 80KB. Originals retained.
- [x] Ahrefs' 11 noindex/nofollow entries verified as booking-app/login and fictional prototypes; retained intentionally. Qaiser case-study Product-schema warning is a classifier false positive; CreativeWork retained.
- [x] Consent-based JovaBook page visits and separate trial-interest, plan-selection and login events added to existing GA4/Clarity integration. Focused consent/privacy and pricing tests pass. QA traffic intercepted.
- [x] Production build passed on Windows after restricted build-folder access was resolved.
- [x] CI follow-up: sidebar wordmark now reserves its space while collapsed, preventing hover/focus navigation jumps (five desktop/phone cases pass). Homepage share artwork recaptured with stripped metadata and current source manifest.
- [x] Pre-existing billing test drift resolved without changing production financial logic: current schema manifest, card-backed trial fixtures, legitimate online commission origins, shared v3 consent, pending-action conflict safety, current customer subdomain return and canonical online booking in the isolated verification harness. Focused suites pass: subscriptions 40, commission/deposit/trial 62, customer payment/refund 26. All provider transports are simulated.
- [ ] Feature PR, review, explicit merge approval and correct marketing production deployment.
- [ ] After deployment: live URL/image/canonical/sitemap checks, GA4/Clarity receipt, saved JovaBook report, Google/Bing sitemap refresh and indexing requests where supported. Ahrefs recrawl after production changes.

Current release checkpoint, 2 November: final removed sections remain removed. The actual sandbox GBP10 deposit, confirmed booking and cancellation refund passed. 125 focused server/database checks and twelve desktop/mobile browser cases passed across two runs. Production build passed. Live salon connections remain blocked by Stripe despite completed review; the support escalation is authorized and in progress. PR/merge/deployment and post-deployment checks remain. Current details: jovabook-deposit-release.md.

Latest user decisions take precedence. New requests are added here, not substituted for unfinished work.

## Current delivery
- [x] Remove the messages, notes and memory problem section.
- [x] Restore the complete original 1:42 Full HD film with original audio.
- [x] Remove the extra tools introduction and use plain feature headings.
- [x] Restore reference-led, slim pricing columns with Standard highlighted.
- [x] Remove tiny marketing footnotes; put material fees in readable pricing and explanations in FAQ.
- [x] Use complete, real HD panel images; preserve the full business website screenshot.
- [x] Make the six actual workspace themes interactive.
- [x] Keep FAQ exclusive and stop connector lines outside question markers.
- [x] Keep pricing near the bottom, with primary free-trial CTAs linking to plan selection.
- [x] Remove the pinned services/client/team scroll stopper and tabs; keep useful feature content in normal page flow.
- [x] Move Insights after website editing and workspace themes.
- [x] Remove Useful controls and its repeated feature descriptions.
- [x] Replace the large booking video and step controls with a compact real availability GIF.
- [x] Use six distinct industries: Hair & beauty, Healthcare, Education & tutors, Coaches & trainers, Consultation services, Spa & wellness.
- [x] Add real setup images for services, working hours and sharing a booking link.
- [x] Add subtle pointer depth to the workspace theme panel and lightweight side entrances.
- [ ] Tighten spacing and balance white, pale blue, warm and navy sections without gradients.
- [ ] Keep canonical, indexability, structured data and useful visible FAQ/feature text aligned with actual capabilities.
- [x] Finish browser interaction, keyboard, reduced-motion and responsive checks, lint and production build. The final copy-only film clarification passed scoped lint.
- [ ] Create PR, merge under standing explicit authorization and verify deployment.

## Next queued request
- [x] Add JovaBook pricing to the main Pricing page.
- [x] Tabs: JovaBook, Websites, Webcare; JovaBook selected by default.
- [x] Reuse JovaBook prices, annual discount and commission details from the product page.

## Product facts requiring honest communication
Online customer deposit collection and native Instagram Book Now integration are not live. Sharing the business booking link in an Instagram bio or message is supported. Provider connection alone does not enable customer checkout. This design release does not activate payment collection, SMS credits, recovery delivery or the future AI assistant.

## Recorded verification
The original film and restored export have identical video and audio stream hashes. Seven viewport widths (320 to 1920) passed before the latest layout revision; rerun required for the final layout. Shared FAQ behavior passed desktop and phone. Six theme screenshots were captured at native 2880 x 1920 from the isolated local app. All local capture requests to external services were blocked.

## Latest Apple reference review, 2 November 2026
- [x] Replace Services, Client details and shared calendar coloured blocks with neutral grey wide product panels, complete real screenshots, next-panel peek and pagination.
- [x] Replace the setup stack with a horizontal Services, Working hours and Booking link showcase.
- [x] Manual swipe and dot controls, keyboard Home/End/Left/Right, full-size image dialogs and reduced motion. No autoplay, vertical pin or gradients.
- [x] Digital partner cards have titles only and dark translucent blue artwork with actual UI composited into device screens.
- [x] Compact availability GIF has finite playback and no pause button.
- [x] Local carousel checks passed at 390, 820 and 1440 pixels: every dot, image dialog, Escape and keyboard navigation; no root overflow or browser errors.
- [ ] Final complete-page release validation, PR and deployment remain pending.

- [x] Latest refinement: Services, Client details and shared calendar show centred headings and complete screenshots only. Removed subtext and CTA, reduced panel height to viewport-aware sizing and narrowed panels to reduce empty side space.

- [x] Replace passive availability GIF with an isolated interactive booking walkthrough, service/date/time selection and prefilled fictional details, ending at Review. No forms, database, storage, booking API, confirmation or payment action.
- [x] Latest desktop and phone regression: four tests passed, including the complete walkthrough to Review and restart, zero booking/API/non-GET requests during interaction, six theme switches, plan choice, annual pricing, main Pricing tabs and exclusive FAQ. Time selection is required before continuing. Scoped lint passed.

## Current refinement queue
- [x] Industries use the Services page split-card proportions, left photography, centred right copy and neutral rounded surfaces.
- [x] Booking walkthrough bottom actions: Back left, Date & time / Continue / See review / Start again right. Selecting a service no longer jumps forward.
- [x] Feature rail shows actual service editor, client history and shared team calendar, rather than three similar lists.
- [x] Included website keeps the complete image, with useful introduction, booking-link and business-details copy spread alongside it.
- [x] Setup trial buttons removed. Screenshot element sizing and rounded clipping remove rectangular grey corners; decorative screenshot shadows removed.

- [x] Demo heading: Everything your salon needs to take bookings and grow. Supporting copy invites a closer look at the tools. Cards section renamed A booking system built around your business, retaining the four current cards.
- [x] Latest four desktop/phone regression tests passed. Three-width refinement check passed: bottom actions aligned, Back preserves time selection, setup CTAs absent and complete website screenshot retains native aspect ratio.
- [x] Removed the four decorative booking/calendar/client/website image cards after user review. Kept the booking-system heading, introduction and Choose your plan button as a compact transition after the film. The real product screens remain in their feature sections.

## Latest section and photography decisions
- [x] Entire Get your business ready / setup carousel removed. This supersedes earlier requests to design it.
- [x] Services / Clients / Your team rail uses relevant photography, not app screenshots; the duplicate team-calendar message is removed.
- [x] Standalone calendar copy and layout retained in a full-width neutral-grey band.
- [x] Feature carousel stays white. Industries use light grey with white split cards; pricing uses a separate darker grey section.
- [x] FAQ wrapper padding removed to eliminate the white seam before the final CTA. Final CTA uses JovaMedia blue #235789 with white copy.
- [x] Photography is now inset within each soft-grey Apple-inspired feature card. Heading and smaller image share one bounded panel, with padding on all sides and reduced total height. The rail section itself stays white.
- [x] Corrected carousel optical alignment: symmetric leading/trailing gutters centre every active card on the same axis as its heading, inset image and pagination. Adjacent-card previews remain visible without a left-shifted main panel.
- [x] Final feature-section redesign: replaced the photo carousel and pagination with a compact three-panel interactive composition. All three features remain visible; selecting Services, Clients or Your team expands that panel. No clipping, screenshots, extra CTA or repeated calendar message. Mobile uses an expanded feature with compact adjacent choices.

- [x] Final user decision: remove the whole Services / Clients / Your team feature section. This cancels the final redesign and all earlier carousel variants. Calendar now flows directly into the included website section. No replacement section added.
