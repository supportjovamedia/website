# JovaBook booking workspace

JovaBook is the booking product on book.jovamedia.com. This standalone app lives in `booking-demo/` in `supportjovamedia/website`. The marketing website has its own Vercel project.

## This change

The Acuity walkthrough was used as a workflow reference. The goal is a smaller, clearer JovaBook, with the existing services, clients and booking data reused.

- Four main navigation items: Calendar, Appointments, Clients, Booking setup.
- Booking setup brings together three checks: services, working hours, booking page and link.
- The existing calendar gains a date picker, weekly time grid and click-to-add appointment slots.
- Business hours are shown first. Booking buffers, same-day notice and different team hours sit in closed optional sections.
- The booking page editor shows colour, title, welcome text and a preview. Its booking link is ready to copy. Other page options stay closed.
- Service category management is optional. Existing appointment prices and client contact snapshots are preserved.
- A four-choice workspace colour picker personalises the owner dashboard without changing the customer booking page.
- Essential is email-only; SMS is reserved for future Standard and Premium plans. Delivery is still a preview.
- Essential, Standard and Premium are the plan names. Only Essential has the existing subscription preview flow.

This change does not add reports, intake-form building, CSV client import, custom message templates, packages or invoice tools.

## Account data and demo data

`config.js` selects the existing Supabase account service. `accounts.js` supports account authentication, owner salon loading/saving and public booking RPCs. Owner data is scoped by salon. Booking-page preferences use the existing `salons.settings.workspace` JSON structure. No database migration is introduced here.

The fictional demo login is `demo@jovamedia.com` with password `Salon2026`. Demo records stay in this browser under `jovabook-essential-demo-v2`. Reset demo restores only these local records. Use fictional customer details when reviewing.

A real salon's public URL is `/?salon=its-slug#book/service`. A link without a salon parameter opens the local example. Service-specific links include `service=ID`.

Payments, deposits, wallet checkout, subscription charging, payout records, email delivery, SMS delivery and AI remain previews or planned integrations. An email preview is a stored record, not evidence of delivery. This UI work is not a live payment, security or concurrency audit.

## Local development

With Node.js available, run from this folder:

```powershell
npm run dev
npm run check
```

Open http://127.0.0.1:4317. Set `PORT` to use another local port. There are no runtime dependencies to install.

Entry points: `#login`, `#calendar`, `#appointments`, `#customers`, `#booking-setup`, `#availability`, `#scheduling`, `#book/service`.

## Browser verification

```powershell
npm run test:workflows
```

The browser test requires an existing `@playwright/test` installation and Chrome or Edge. It uses a fresh browser context, intercepts account configuration and blocks external requests. `BASE_URL` must be a local preview. Optional `PLAYWRIGHT_MODULE` selects an existing external Playwright module. `BOOKING_QA_DIR` overrides the default `test-results/` evidence folder, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects a browser. The test never signs into a real account or writes live salon data.

The test covers simplified navigation, setup links, calendar creation, business hours, booking-page preferences, normal customer booking and mobile layout. Reported offline results do not verify Supabase policy enforcement, provider delivery or real charges.
