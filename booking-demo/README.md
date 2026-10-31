# JovaBook owner experience

The booking product lives in `booking-demo/` in `supportjovamedia/website`. Its live domain is https://book.jovamedia.com/. The marketing website uses a separate Vercel project.

## Navigation and scope

The main menu is Calendar, Appointments, Clients, Services, Staff, Personalise and Insights. Settings remains a dropdown for Working hours, Business details, Email reminders, Payments and Subscription.

- Working hours has an opening and closing time for each day, including closed days. Staff can follow business hours or have their own daily schedule. Bookable availability is the intersection of both schedules.
- The calendar can show any combination of staff across day, week and month. Existing appointment creation, rescheduling and cancellation are retained.
- Multiple sessions is an owner-only workflow: check 2 to 12 dates, review availability, then confirm the complete series. Customers book one appointment at a time.
- Insights calculates appointment counts, scheduled value, booked hours, top services and daily activity from actual saved appointments. Scheduled value is not collected revenue. Cancelled and no-show appointments do not contribute to its value totals.
- The in-app bell shows actual new-booking, cancellation and reschedule activity. Read state is stored per owner and salon in the current browser. Connected owner sessions check for new activity every 30 seconds without interrupting an open form.
- Personalise separates workspace appearance from the customer booking page. A workspace colour changes the header, sidebar, selected controls and accent surfaces. The booking page has its own colour, welcome text, preview and link.
- Staff limits are Essential 1, Standard 5 and Premium 10. The migration derives these from a protected server plan field. Existing excess records are preserved; adding more is blocked.
- Rejected database writes no longer become fake Saved records. The app restores authoritative salon data when possible and keeps a browser-only recovery copy of the unsaved draft under `jovabook-essential-demo-v2-unsaved`.

The recording supplied on 30 October was used to review scheduling, staff availability, client records, sharing and reporting. Packages, gift vouchers, invoice tools, coupons and an integration marketplace are outside this revision.

## Real accounts and the fictional demo

`config.js` selects the existing Supabase account service. `accounts.js` handles account authentication and salon-scoped storage. No secret key is added to the browser. Settings use `salons.settings`, and owner scheduling capabilities are read from the database before new live controls are enabled.

The demo login is `demo@jovamedia.com` / `Salon2026`. Its records remain in the browser. Older seeded demo credentials repair automatically without changing registered accounts or deleting diary records. A missing fictional salon is restored only when demo sign-in is requested. Fresh demo data has one staff member; earlier demo records are retained.

Real salon booking links use `/?salon=slug#book/service`; service links also include `service=ID`. A link without a salon parameter uses the fictional demo. Reset demo affects local example records only.

Payments, deposits, subscription charges, email delivery, SMS delivery and AI remain previews or planned integrations. Essential is email-only; SMS is reserved for future Standard/Premium integrations. Provider delivery and billing are not activated by this revision.

## Run and verify

From this folder, with Node.js available:

```powershell
npm run dev
npm run check
npm run test:owner
npm run test:database
npm run test:owner:browser
```

The local server binds to 127.0.0.1:4317. Set `PORT` for another port. There are no runtime packages to install.

Core tests use Node. SQL tests need the existing `@electric-sql/pglite` development dependency; `BOOKING_NODE_MODULES` can point to another existing node_modules folder. Browser tests need the existing `@playwright/test` package and Chrome/Edge; `PLAYWRIGHT_MODULE` can select an external installation. `BOOKING_QA_DIR` selects the evidence folder. `BASE_URL` must be local.

The integrated suite loads real account configuration but intercepts every external request. It uses fictional demo records and explicit mock account responses, never live salon writes. It checks navigation, daily hours, weekend-only services, calendar filters, staff limits, Insights arithmetic, series atomicity, account recovery, sharing, ordinary booking, rejected saves, notification polling/read state and responsive layouts. `test:workflows` and the old Acuity test path are compatibility aliases for this suite.

## Database update

Apply `supabase/migration_owner_experience.sql` once after the three existing schema files. The new additive migration preserves records, introduces protected plan entitlements, validates daily schedules and direct booking writes, and adds an authenticated atomic series RPC.

Do not enable the new live controls before the migration is applied and verified on the target project. Without its capability response, daily-hour saving, new staff and multiple sessions show an explicit setup-needed state. Local SQL tests emulate Auth/RLS roles; they do not certify hosted permissions, simultaneous hosted writes or provider delivery. See DEPLOYMENT.md and OWNER-EXPERIENCE.md for rollout status.
