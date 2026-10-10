# Consultation and product checkout

Status: localhost preview on a feature branch. The catalogue contains Landing Page £350, Business Website £550, Website with Booking System £2,000, Web Care £39/month and Web Care Pro £99/month. The user confirmed that the business is not VAT registered, so no VAT is charged. The user selected the new JovaMedia Stripe account and reports completing onboarding. Credentials, account readiness and commercial terms still require verification. No real payment has been taken or tested. Checkout is disabled by default.

## Customer journeys

- Homepage consultation CTA > `/consultation` > name, email, country, optional website and notes > existing protected `/api/contact` > business inbox through Resend. A lead event fires only after delivery is accepted.
- Pricing navigation > `/pricing` > Websites or Subscriptions category filter > Add to basket > `/basket` > hosted Stripe Checkout when enabled > verified `/checkout/complete`. `/products` redirects to Pricing. Products are not shown on the homepage.
- Stripe's signed `/api/stripe/webhook` verifies the paid session and sends an order notification to the existing business inbox. Stripe retains the customer and order record. The site does not store card details.

## Remaining business decisions

1. Prices are confirmed in `lib/products.mjs`. The Business Website covers Home, About, Services and Contact, an enquiry form and one clear CTA. Web Care includes up to 15 minutes of minor edits per month; Web Care Pro includes up to 45 minutes. Edit time does not roll over. Amounts use integer pence. Only one care subscription can be selected per basket.
2. Confirm final service scope, revision allowance, delivery times, cancellation/refund terms and third-party costs. These are services, so avoid selling undefined scope. The current website terms require a separate written service agreement. Do not enable paid checkout with those terms unchanged. The catalogue states that subscriptions renew monthly until cancelled and explains cancellation by email.
3. Use the new JovaMedia Stripe account, as requested by the user. Verify its business identity, payment readiness and scoped credentials before configuration. The older ProfitwithMaryam account must not receive these orders.
4. Confirm whether this is a test-only demonstration or an actual sales checkout. Start in Stripe's test environment, then enable live payments only when account verification and the above terms are complete.

## Server environment

Keep these in Vercel project environment variables, scoped to the correct environment. Never commit keys or use NEXT_PUBLIC for secrets.

```
CHECKOUT_ENABLED=false
COMMERCE_TERMS_APPROVED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

The existing `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, reCAPTCHA configuration and public analytics IDs are reused. No new newsletter subscription is created by a consultation or purchase.

Use the selected Stripe account's test secret key first. Add a webhook destination for `https://www.jovamedia.com/api/stripe/webhook` (or the preview's exact URL for test QA). Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Set the signing secret in the matching environment. Stripe's public business details must contain the final terms URL, because Checkout requires terms acceptance. Register live and test destinations separately.

Baskets containing a care product use Stripe subscription mode. Website builds remain one-off line items in the first subscription invoice. The basket separates the amount due today from the recurring monthly amount. The current webhook reports the initial paid order; it does not send fulfilment emails or analytics purchases for every later renewal. Ongoing subscription billing and cancellation must be managed in Stripe. Validate mixed one-off and recurring orders, renewal, failed renewal and cancellation in Stripe test mode before enabling subscriptions.

After confirmed integer-pence prices, VAT wording and terms are in the catalogue, set both approval flags to true in a test environment. Test a success, decline, cancellation, refresh/retry, duplicate webhook and email outage. Then review a real Stripe test order and the inbox notification. No live card transaction is needed for QA.

## Measurement

Events are sent directly to GA4 after consent, and mirrored into GTM's dataLayer with `jova_` prefixes. Clarity receives named events on eligible public pages. Do not create duplicate GA4 or Clarity installations in GTM.

| Journey | Events |
| --- | --- |
| Consultation | `consultation_click`, `form_start`, `form_submit`, `form_error`, `generate_lead` |
| Packages | `view_item_list`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `checkout_error`, `purchase` |

Use `form_id=website_consultation` to distinguish consultation enquiries from `contact_enquiry`. CTA `placement` identifies the homepage hero, preview card, introductory section, packages and basket. Ecommerce events contain allowlisted package IDs and names, quantity, GBP value and a hashed order reference for a verified live purchase. They never include customer fields or raw Stripe session IDs. Test orders never enter production purchase reporting. Form contents are explicitly masked. Checkout and order-status routes are excluded from Clarity. Do not add field text, email addresses or payment session IDs to custom tags.

Recommended GA4 funnels: homepage > consultation > form_start > generate_lead; products > add_to_cart > begin_checkout > purchase. Mark `generate_lead` and `purchase` as key events only after verifying them in the target property. Compare source/campaign and device; evaluate completed, useful enquiries alongside CTA clicks.

## Operational limits

The success page verifies payment independently, but is not the fulfilment trigger. Webhooks handle paid-order notifications even if a customer closes the browser. Provider idempotency plus a durable Stripe session metadata marker prevent ordinary duplicate notifications. If Stripe's metadata update fails after email acceptance, Resend's idempotency window protects immediate retries; reconcile a delayed retry manually if needed.

Checkout rate limits are short-lived per server instance, alongside Stripe's idempotency. They are not a distributed abuse-control service. Monitor Stripe and Vercel for unusual volume before promoting the paid offers.
