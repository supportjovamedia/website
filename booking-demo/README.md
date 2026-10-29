# JovaBook Essential preview

A plain functional prototype of the Jova subscription booking product. The isolated Vercel project jovamedia-booking-preview serves it at https://book.jovamedia.com/. The main Jova marketing website stays in its existing project. The application remains a browser-data prototype, not a live booking or billing backend.

## Hosted entry points

- Product and Essential offer: https://book.jovamedia.com/
- Salon onboarding: https://book.jovamedia.com/#signup
- Customer booking page: https://book.jovamedia.com/#book/service
- Salon owner login preview: https://book.jovamedia.com/#login
- Salon dashboard: https://book.jovamedia.com/#dashboard
- Jova subscription preview: https://book.jovamedia.com/#billing
- Booking email and day-before SMS previews: https://book.jovamedia.com/#notifications

The price is £20 per month, not US$20. The available screenshots and payment controls illustrate the intended flow and never create real charges.

## Run

With Node.js available:

```powershell
npm run dev
```

Open http://localhost:4317. The server binds only to 127.0.0.1. There are no dependencies to install.

If Node is not on PATH, the bundled runtime can be used:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.mjs
```

## Explore

Use **All screens** in the top bar to jump between Essential screens. One fictional salon is included. Onboarding updates the one test salon in this browser. Standard and Pro are on hold.

Suggested walkthrough:

1. Pricing → salon signup → setup → simulated trial checkout → dashboard.
2. Payments & deposits → simulated embedded onboarding → enable example deposits.
3. View booking page → service → time → guest details → optional payment → confirmation.
4. Owner calendar → appointment details → reschedule or cancel.
5. Email outbox → inspect confirmation, change and cancellation email previews.
6. Jova subscription → simulate a successful payment, failed renewal or cancellation.
7. Inspect the immediate email confirmation and day-before SMS reminder queue. A sender must be connected before real delivery is possible.

## Implemented local behaviour

- Single demo salon setup and address validation.
- Fictional sample records and owner dashboard preview.
- Services add/edit/remove, customer search/history and JSON export.
- Appointment availability using opening days, hours, duration, buffer and overlap checks.
- Customer and manual appointment creation, rescheduling, cancellation and completion.
- Booking snapshots, simulated deposit transactions and email previews.
- Editable salon details and business branding.
- Simulated subscription states and payment methods.
- Browser persistence through localStorage and Reset demo controls.
- Same-origin customer and salon views using browser-local data.

## Simulation boundaries

There is no production authentication, API, database, real subdomain routing, multi-user concurrency protection, webhook processing, Stripe integration, real wallet checkout, email delivery, SMS or language model connected. The payment onboarding UI is a mock-up, not Stripe's actual component. The scripted assistant explains the future flow and reads the local availability; it does not use AI credits.

All data is stored under `jovabook-essential-demo-v2` in this browser. Separate browsers will have independent demo data. Use fictional details. Reset demo removes this app's example records only. This is not shared database storage or a security boundary.

## Pending live integrations

The existing Vercel preview project has Supabase configuration variable names. Inspection did not find Resend, SMS Works or Stripe configuration names on that project. No credentials were decrypted, copied from the production website or added to the browser. Real owner authentication, database persistence, email delivery, server-side reminder scheduling and Stripe billing must be implemented and verified before accepting real salon clients.

Deposit payments remain recorded when an appointment is cancelled; no refund is simulated. Trial and subscription events require the supplied demo controls and do not run real billing jobs. Appointment-management references are public demo IDs, not production secure tokens. Cancellation notices are illustrative, not a complete policy enforcement system.

## Verification

JavaScript and server syntax checks passed, and the local server returned HTTP 200. Browser verification covered signup, service/hours setup, trial activation, three-step simulated payment onboarding, guest booking with a simulated wallet deposit, confirmation, rescheduling, cancellation, and the resulting email records. Additional checks and any observed limitations are recorded with the delivery.
