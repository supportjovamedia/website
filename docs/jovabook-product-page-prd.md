# JovaBook product page PRD

Status: approved visual direction, detailed implementation brief. Updated 1 November 2026.

## Purpose and audience

Make JovaBook understandable and desirable to an independent UK business owner who currently manages bookings through messages, a paper diary or separate tools. Salons are a strong example, but the language must include other businesses selling appointments. The primary conversion is an Essential workspace trial. Team plans remain visible with honest availability information.

The page must answer: what will this do for my business, what does the real product look like, what can I change myself, what is included for £20, and what will my bill include?

## Decisions from the design review

- Keep the JovaMedia-derived navy hero, yellow primary button, rounded surfaces, restrained motion and broad page layout. Borrow existing JovaMedia website and product-section layouts rather than inventing a new style system.
- Main CTA: **Try JovaBook for free**. Explain the actual three-day trial near pricing and the final conversion area. The trial starts at registration, including setup. It does not automatically create a paid subscription.
- Remove the extra Demo / Features / Plans / Login product navigation and numbered setup steps. Keep the established JovaMedia site navigation. An existing-account login link remains available near account/pricing information.
- Replace every recreated product screen with a screenshot captured from the working application. No fabricated HTML calendars, imitation client cards, decorative stickers, stars, hearts, replay buttons or illustration labels.
- Use the existing JovaMedia FAQ component with product questions and its established interactions. Respect reduced motion.
- About 1,100 to 1,500 useful words, driven by evidence and buyer questions rather than keyword repetition. No invented customers, time-saving percentages, reviews or ranking claims.

## Verified product and commercial facts

| Area | What we can say | Boundary |
| --- | --- | --- |
| Online bookings | A business-specific booking link, service selection, available time selection and booking details | Do not imply online deposits are live |
| Calendar | See bookings on a timeline, use category colours and open booking details | Check actual calendar view labels; dashboard Day / Week / Month is a separate feature |
| Services and availability | Set prices, durations, categories, daily opening hours, closed days and buffers | Team hours and service assignment belong to entitled team plans |
| Clients | Search and edit contact records, inspect booking history | Screenshots use fictional demo records, with no real customer data published |
| Business website | Included one-page website for Essential and Standard, with business introduction and booking link | Do not sell an unrestricted website builder or multiple Essential templates |
| Personalise | Edit website headline, hero image, About text and colours; separate booking-page presentation settings | Phone, email, opening hours and booking rules remain in Business details |
| Workspace styles | Six styles: Jova Blue, Rose Studio, Midnight Glass, Forest, Warm Studio, Amethyst | Workspace theme is separate from customer-facing booking and website branding |
| Dashboard | Day, week and month overview with bookings, completed-service revenue, completed bookings and cancellations | Clearly distinguish booked value from collected or completed revenue |
| Insights and team | Standard: up to five staff and Insights. Premium: up to ten staff, Insights and zero booking commission | Essential has one owner and no Staff management or Insights access |
| Email | Booking messages and reminders, with delivery status when email delivery is activated | No guaranteed delivery or guaranteed reduction in no-shows |
| Integrations | Connection setup and status screens for Stripe, PayPal, Mailchimp, SMS Works and Twilio | Hosted authorisation requires platform setup; deposits and messaging extras are not operational just because an account connects |

Prices: Essential £20/month or £192/year; Standard £50/month or £480/year; Premium £100/month or £960/year. Annual subscriptions are paid upfront with a 20% subscription discount. Commission is 1% on Essential and Standard, 0% on Premium. It uses the full saved service price in the period when the appointment takes place. Commission remains monthly for annual subscribers. Payment processing fees are separate. Do not copy the supplied reference image's incorrect no-commission claim.

## Page and sales argument

| Section | Buyer question and argument | Required visual and execution |
| --- | --- | --- |
| Hero | What is this? Online booking for your business, with a calendar, clients and your own business website together | Real dashboard screenshot in laptop, real booking page in phone. Use the calendar in its own section to avoid repeating the hero. One free-trial CTA and a video action. Include £20 + 1% price line. Clear product-category language alongside the brand headline |
| Booking and calendar | Can clients book themselves, and can I see what is happening? Show the transition from a shared business link to an organised day | Large actual calendar screenshot and genuine customer service/time page. Explain category colours and opening a booking. Avoid miniature UI that is unreadable |
| Services and working hours | My services take different lengths of time and my working days vary | Real Services screenshot. Explain category organisation, price, duration, per-day availability and buffers in plain language |
| Client records | Where will I find the details when a client calls? | Real Clients view with history if available. Show search, contact details and booking context. No generic icon-only card |
| Editable website | Do I need another website tool or a designer for every change? | Actual public website screenshot beside the real Personalise screen. Explain hero image, heading, About text and booking link; contact details and hours update from Business details |
| Personalisation | Will it feel like my business, and can I choose a workspace I like? | Real theme-picker screenshot. Name all six workspace styles, include dark mode, and distinguish workspace style from the customer website and booking-page colours |
| Product film | Can I see it before signing up? | Embed the supplied film's verified booking/calendar excerpt with native controls. Use poster and preload none. Do not publish the sections promoting unlaunched deposits, SMS or recovery as active |
| Costs and commission | What does 1% actually mean, and why upgrade? | Explain that a £50 eligible service adds 50p. Premium has no JovaBook booking commission. Keep the subscription prices and processing-fee distinction equally clear. No unsupported competitor-cost comparisons |
| Plans | What do I get for £20 and when do I need a bigger plan? | Aligned monthly/annual cards. Show actual staff limits, Essential website and core tools, Standard team and Insights, Premium larger team and 0% commission. Clearly mark extras that are awaiting activation rather than listing them as operational |
| FAQs and final CTA | Resolve practical objections without another sales monologue | Reuse JovaMedia FAQ design. Cover business types, booking flow, changing daily hours, editing the website, Essential versus team plans, annual and commission billing, trial and deposits. Final free-trial CTA with honest terms |

Give each major feature room to make a concrete point, show the product, and explain the useful result. Vary the rhythm with an expansive calendar section, alternating screenshot/copy sections and a quiet website/personalisation group. Three small feature cards must not carry the whole sales argument. Avoid repeating the same problem/solution formula in every section.

## Screenshot and media requirements

Capture the current application at localhost from its explicit demo workspace, using normal UI controls. These are genuine application screenshots, not generated replacements. Publish only fictional records. Crop application chrome and demo-toolbars by framing the screenshot, without drawing new controls or altering the visible product behaviour.

Published asset manifest: dashboard.webp, calendar-desktop.webp, booking-mobile.webp, clients.webp, services.webp, insights.webp, website.webp, website-editor.webp and themes.webp. Native double-density captures are 2880 pixels wide on desktop and 750 pixels wide on mobile. Keep original PNGs and the dimension/metadata receipt in output/product-screens-hd. Preserve aspect ratios and real device frames already present in JovaMedia assets. The phone must show readable service/time content rather than a scaled desktop screen. Screenshots open in a keyboard-accessible full-size dialog, with touch panning on small screens.

Use responsive WebP images with explicit dimensions and accurate alt text. The hero image may load eagerly; lower-page images and video load on demand. Use quiet motion around the image presentation, never a synthetic replay of fake data. The original supplied video remains unchanged in Downloads; the web excerpt is a separate export. Strip AI-tool/provenance metadata from delivery media where technically supported and report the export scan separately from visible content.

## Search, AEO and GEO

Keep one server-rendered canonical sales page at https://www.jovamedia.com/jovabook. Public anonymous home visits to book.jovamedia.com can go there, but all tenant queries, signup/login fragments, customer portals, recovery callbacks and signed-in sessions must remain in the app.

Primary intent: online booking software for small businesses in the UK. Secondary themes: salon booking software, appointment booking calendar, client/service management, booking software with a business website, booking commission and small-team scheduling. These are intent hypotheses, not measured search volumes or promises of easy rankings.

Use readable headings and concise direct answers followed by product evidence. Important information must be in HTML, not trapped inside screenshots or video. Add truthful WebApplication, organisation references, FAQ and VideoObject data matching visible content. No fake AggregateRating, invented popularity or special AI-file claims. FAQ markup does not guarantee a rich result. Search engines and AI answer systems determine inclusion and rankings.

Check title/description, self-canonical, social preview, robots rules, sitemap and internal links. After publication, use free existing Google Search Console and Bing tools to refresh the sitemap and request discovery where supported. Record submission, indexing and ranking separately. No paid indexing. No number-one or AI-citation guarantee.

## Functional and visual acceptance

- Desktop at 1440 and 1920, middle breakpoint near 820, mobile at 390 and 320: no horizontal overflow, cut-off text, overlapping phone/laptop or tiny unreadable body text.
- Hero, feature rows, screenshots, buttons and pricing share consistent margins and vertical rhythm.
- Actual screenshots have loaded at their intended resolution and show the current app. No illustration, sample or replay captions remain on the page.
- Video plays and pauses with native controls. Its published excerpt contains no unlaunched payment or messaging claims.
- Monthly/annual selection changes prices correctly and preserves Essential cadence in the signup URL.
- Navigation, FAQ mouse/keyboard states, focus rings, image loading, reduced-motion behaviour and hover states are exercised in the browser.
- Public-home routing preserves owner sessions, tenant booking links, customer routes and password recovery.
- Real Stripe/Mailchimp authorisation work remains separately gated until platform configuration is complete. Provider names must not imply working deposits, PayPal merchant approval or SMS delivery.
- Scoped lint, meaningful routing/OAuth/tenant regression checks and a clean production build pass before merge. Use a short build worktree on Windows if path-length limits interrupt output generation.

## Release and remaining dependencies

Use codex/jovabook-marketing-connect, open a pull request and follow the user's standing merge/publish authorisation after review and checks. Verify both the main JovaMedia deployment and the booking app deployment, since public routing and integrations ship there too. Leave the localhost preview open for inspection.

Stripe Connect needs a dedicated configured platform; Mailchimp needs its registered application and callback; hosted PayPal onboarding needs partner approval. SMS Works has not granted the trial credits as of the latest balance check. Deposit collection, recovery sending, Premium AI and automated account deletion remain separate operational work. These dependencies do not justify overstating the launch-page offer.
