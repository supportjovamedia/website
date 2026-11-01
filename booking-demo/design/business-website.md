# JovaBook fixed business website

Essential and Standard use one editable page. Premium adds three fixed content pages and two templates, with no page builder.

## Premium website

- Home, About and Contact have their own public routes: `#website`, `#website/about`, and `#website/contact`. Navigation preserves the business query. Book now enters the existing tenant booking flow, while My bookings retains the customer account hook.
- Studio uses the full-photo, centred Home hero. Editorial uses a restrained split photo/text Home layout, stacked on mobile, and a photo-first About layout. Both reuse the single managed hero image.
- Home has a headline, booking action and optional introduction. About uses the saved About text with an optional heading. Contact uses an optional introduction plus canonical hours, phone, email and address from Business details.
- The public RPC provides `website_entitlement` only after its existing billing and booking-horizon wrappers succeed. Premium requires the business plan and canonical paid plan to agree. Editable workspace JSON cannot grant the entitlement.
- A downgrade renders the original one-page website. Advanced fields are masked in the non-Premium public response, while saved owner content remains intact for a later upgrade.
- Verified Premium removes Powered by JovaMedia from the public website and customer booking footer. Essential and Standard retain the attribution, and downgrade restores it. Editable website settings cannot suppress branding. Booking privacy and cookie controls remain available.
- No new image bucket, contact form, arbitrary section editor, dependency, legal footer or provider integration is introduced.

## Public website

- Full viewport, edge-to-edge cover photo, minimum 100dvh. No separate header strip or copy card. Retain the existing customer account navigation hook over the hero.
- The headline itself stays horizontally and vertically centred. A content-width Book now action sits below it. On photos, white text with a 58% black overlay guarantees readable contrast. The accepted custom heading colour applies to the neutral no-image fallback and light content sections.
- A generous white About section follows, with the actual saved business text and second Book now action. Both actions enter the same tenant's booking service selection.
- Opening hours and Contact follow, two columns on desktop and stacked on mobile. Read actual business hours, phone, email and address from the existing settings. Missing values stay absent or use an honest empty message. Never invent hours or contact data.
- Small footer: business name, with Powered by JovaMedia on Essential and Standard. No invented legal or cookie links.
- Neutral public colours remain independent of all six admin workspace themes. Brand colour controls the two actions; choose readable black or white action text automatically.
- Without a photo, retain hero dimensions with a neutral background and no giant initials. Broken photos use the same fallback.

## Owner editing

Personalise retains Website and Booking page panels. Headline, uploaded photo, About text and colours remain shared. Premium exposes a small Home/About/Contact selector and Studio/Editorial radio choices, plus bounded Home introduction (500 characters), About heading (100) and Contact introduction (500). Page switching retains drafts; one Save website action publishes the complete fixed site. The same Premium controls stay visible but disabled on lower plans. Saving base fields after a downgrade preserves the saved Premium fields.

The embedded preview uses the public renderer at a reduced scale and remains visually independent of the workspace theme. Its navigation opens saved public routes in another tab. Changes publish only after a confirmed save and fresh backend read.

Hours and contact are edited only in Settings > Business details. Personalise supplies two links to that page, including its working-hours section. Business details combines business name, description, address, phone, email, working hours and booking rules on one page, without top tabs. Retain existing deep links and canonical save/backend behaviour.

## Sidebar

Keep nav rows, logo, Settings and pin on the same vertical positions across collapsed, hover, focus and pinned states. The redundant desktop business card is hidden; the existing topbar still identifies the business. Settings must stay inside the viewport and its pin remains a separate footer control.

## Acceptance

Exercise actual controls before release: upload/replace/remove, draft/save/discard, persistence, stale-owner isolation, keyboard focus, all tenant-specific booking links, settings edits and sidebar hover/pin/dropdowns. Check desktop 1440px, 1280px and short 1024px plus mobile 390px and 360px. Inspect actual photo and empty-state screenshots, maximum-length content, six editor themes, missing hours and unsafe contact data. Local fixtures intercept all writes; no real email, SMS or payment is sent.

Premium-specific checks live in `tests/premium-website.mjs`, `tests/premium-website-browser.mjs` and `tests/premium-website-sql.mjs`. They cover both templates and all three routes, whole-site save/reload, page draft retention, lower-tier locks, downgrade/re-upgrade retention, stale owner uploads, public entitlement spoofing, keyboard navigation, 360px layout, offline SQL privileges, and preservation of billing and the 75-day booking horizon. The existing one-page unit/browser suites remain required regressions.
