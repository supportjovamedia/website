# Booking instructions and service descriptions

- Reuse `bookings.notes`, labelled **Special instructions** on appointment forms and details. Private customer-record notes are unchanged.
- Calendar slots with notes show a red **Note** label. Calendar and Bookings both open the same full instruction section.
- Booking-slot arrows are removed. Day and month grids use square, full-width edges within the workspace, without another rounded card around the grid.
- Notifications show up to 120 characters, then **View more / View less**, without fetching, re-rendering or marking the event as read.
- Business email copies include the booking instructions. Customer email copies do not expose appointment notes.
- Services keep their existing name. An optional plain-text description is limited to 1,000 characters in the editor and database, saved with the existing service request, and shown on the booking page.
- No photos, uploads, duplicate instruction columns, plan changes or background polling.

The description migration is additive and has not been applied to production. Existing service rows default to an empty description. The existing public-salon restrictions run before descriptions are added; no private customer data is added to public availability.

Local verification: 51 focused module, notification, email, service, schema and offline-guard checks passed, plus three asset-bundle checks. The built app retains three hashed bundles. Manual local checks covered the red calendar label, full instructions through Calendar and Bookings > three dots > View booking, and an expandable 500-character notification. The existing fictional demo booking for Yusuf Rahman on 24 November at 15:25 carries that example. No live customer records, messages, payments or uploads were created.

## WowWagon facts to use in an unsent reply

The current code supports named services with prices and durations, available date/time selection, single-calendar conflict checks, a shareable booking link, and Solo/Team Stripe deposits. The deposit setting accepts 100%, so the full service price can be taken through the same flow when Stripe is connected. Solo is currently GBP20 per month. Website embedding is available on paid plans; links can be shared in Instagram and WhatsApp.

Avoid promising automatic midnight surcharges or service-specific midnight restrictions: those are not implemented. A separately priced service does not itself restrict the cheaper services to daytime. Confirm their visit durations, travel/setup allowance and midnight-only requirements before proposing the final setup. Bookings must fit within a day's configured opening hours; do not promise visits that cross midnight without a separate scheduling review.

There is no dedicated delivery-address field in this change. Instructions can carry that text, but do not describe it as a structured address or routing feature.
