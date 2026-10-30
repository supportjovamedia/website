# Essential preview deployment

Date: 29 October 2026.

The single-salon Essential preview is hosted at https://book.jovamedia.com/ on the existing jovamedia-booking-preview Vercel project. The root domain and www marketing site use their existing separate project. The wildcard remains configured; book.jovamedia.com has its own exact project assignment.

Latest deployment: dpl_4X6La96uhWjX1TqjPKVrkQXj3abV. The isolated demo project's target is production, so its assigned preview-domain aliases serve this version. This does not make the demonstrated payment or authentication flows production integrations.

Source files deployed: index.html, app.js, enhance.js, style.css and vercel.json. It is a buildless static deployment. The response includes noindex, nofollow so the preview is not intended for search indexing.

## GitHub source

The source is tracked in `supportjovamedia/website`, under `booking-demo/`. The first hosted version was uploaded directly through the Vercel deployment API. That upload did not use GitHub. Adding the source here does not automatically configure Git deployments for the separate preview project. For a future Git connection, select this repository and set its root directory to `booking-demo`, with framework Other, no build command and output directory `.`.

## Test entry points

| Experience | URL |
| --- | --- |
| Essential product | https://book.jovamedia.com/ |
| Salon onboarding | https://book.jovamedia.com/#signup |
| Customer booking | https://book.jovamedia.com/#book/service |
| Owner sign-in preview | https://book.jovamedia.com/#login |
| Owner dashboard | https://book.jovamedia.com/#dashboard |
| Jova subscription preview | https://book.jovamedia.com/#billing |
| Email and SMS previews | https://book.jovamedia.com/#notifications |

## Delivery scope

One test salon; Essential priced in GBP at £20/month. Standard and Pro are not offered for purchase. The UI illustrates an immediate confirmation email and a day-before SMS reminder, alongside owner onboarding and the separate Jova subscription journey.

The app stores data in the current browser. Authentication, shared database persistence, actual emails, actual SMS and real Stripe payments are not connected. The preview shows these boundaries explicitly. No live subscription products, SMS credits, phone-number rentals or vendor plan upgrades were purchased.

Environment-variable metadata on the preview project contained Supabase URL and secret-key names, but no SMS, Resend or Stripe configuration names. Secret values were not retrieved or copied. A user-created SMS Works account still requires server-side integration and verified test delivery; account creation alone does not connect it to this static preview.

## Verification

- App and server JavaScript syntax checks passed.
- Vercel accepted the custom domain as verified with no DNS configuration error.
- HTTPS GET of book.jovamedia.com returned HTTP 200 and the expected Essential preview title.
- The hosted product, owner login preview and single-salon dashboard were inspected in the browser.
- The earlier localhost build was exercised through signup, setup, trial activation, payment setup preview, booking, rescheduling, cancellation, email previews and occupied-slot removal.

This is a reviewable hosted prototype, not a service ready to accept real customer records or charges.
