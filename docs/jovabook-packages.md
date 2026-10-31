# JovaBook package scope and readiness

Authoritative package decision: the user's latest package selection, followed by the explicit correction that Essential has no Insights. Website fulfilment is manual: JovaMedia builds and sets up the site. This document separates package inclusion from implementation and activation. It does not announce a new price or provider connection.

| Package feature | Essential | Standard | Premium |
| --- | --- | --- | --- |
| Bookable staff limit | 1 | 5 | 10 |
| Online booking | Included | Included | Included |
| Clients and services | Included | Included | Included |
| Booking calendar | Included | Included | Included |
| Basic Dashboard statistics | Included | Included | Included |
| Insights, including booking trends and top services | Excluded | Included | Included |
| Website | One fixed one-page template, no template choice | One fixed one-page template, no template choice | Choice of two multi-page templates |
| Website setup | Built and set up by JovaMedia | Built and set up by JovaMedia | Built and set up by JovaMedia |
| Website brand and heading colours | Owner can edit in Personalise | Owner can edit in Personalise | Owner can edit in Personalise |
| Email reminders | Included | Included | Included |
| Text reminders | Excluded | Included, activation pending | Included, activation pending |
| Slot recovery | Excluded | Included, implementation pending | Included, implementation pending |
| AI assistant | Excluded | Excluded | Deferred until a paying Premium customer needs it |

JovaMedia supplies and sets up the fixed template. Owners edit its headline, hero image, About text and colours in Personalise. Essential and Standard have one one-page layout. Premium's two multipage templates remain future work. AI implementation is deferred; the existing scripted preview is not a live assistant.

## Current implementation evidence

| Area | What the repository currently provides | Remaining operational or commercial work |
| --- | --- | --- |
| Core online booking | Customer service/time selection, booking creation, changes/cancellation, staff availability and tenant-scoped diary data | Provision and verify each business using the authorised operational workflow. Local test passes are not a new production verification. |
| Clients, services and calendar | Client/service management, category colours and day/week/month calendar views | Continue account-level setup and support. |
| Staff limits | `JovaSchedule.plan` resolves Essential 1, Standard 5 and Premium 10 from `entitlements.plan`, then `plan`; backend capabilities enforce roster operations | Plan changes must be confirmed by the authorised server workflow. Workspace colour/page settings are not entitlement inputs. |
| Essential Insights exclusion | Essential navigation hides Insights; direct links show a plan explanation; stale or forged Insights filter submissions and changes are blocked before analytics are calculated | No new analytics API or database privilege is introduced. Essential retains its basic Dashboard statistics and ordinary booking records. |
| Standard/Premium Insights | Existing date/staff filters, status counts, booking trends and service rankings | Access follows the freshly loaded authoritative plan, including downgrade and account changes. |
| Websites | Separate Website and Booking page tabs in Personalise; saved tenant-specific public website, image upload, headline, About text and brand/heading colours; both booking buttons preserve the business link | Set up each business's real content and domain. Premium multipage template choices remain future work. Hosted Storage configuration is verified; authenticated upload HTTP behaviour is covered with isolated mocks and actual SQL policies, without a new production test account. |
| Email reminders | SQL-owned event/queue records, automatic booking changes and 24-hour reminder workflow, provider worker/webhook integration and owner-visible status | Read-only production verification on 31 October 2026 confirmed delivery enabled, worker/webhook configured and reminder schedule active. No real customer message was sent during this change. |
| Text reminders | The SMS Works adapter, private queue, segment budgets, Standard/Premium controls and optional customer consent are implemented and isolated tests pass | Sending remains disabled. The disabled production migration is installed. Worker configuration/schedule, agreed limits, provider credits and a recipient-approved delivery test are required before activation. No paid credits have been bought. |
| Slot recovery | No completed cancellation-to-waitlist/rebooking workflow | Define and implement eligibility, contact permissions, availability rechecks and customer messaging. Not implemented by this correction. |
| Premium AI assistant | `chatSend` is an explicitly scripted demo preview | Deferred until a paying Premium customer needs it. No live AI integration is claimed. |
| Recurring paid subscription billing | `owner_subscription` returns `billing_connected:false`; plan changes are review requests. `checkoutPage` explicitly says no card is charged and no real subscription is created | Real recurring checkout, payment lifecycle/webhooks, renewal failures, customer billing management and commercial activation remain to be completed/verified for JovaBook. A generic site Stripe integration is not proof this booking subscription flow collects money. |
| Deposits/payment account setup | Existing app screens retain demo setup and simulated transaction language | Verify an actual JovaBook payment provider integration before claiming real collection through these screens. |

The existing subscription guide prices are unchanged. Package membership is the agreed product scope; it does not make an unimplemented extra operational. Essential should not be described as fully commercially ready until its billing and fulfilment arrangements are complete.

## Verification for this correction

The browser suite uses synthetic `@example.test` clients, a local HTTP file server and intercepted backend responses. It creates no production accounts, changes no provider configuration, sends no messages and charges no payments. The before phase reproduces Essential's previous Insights exposure; the after phase checks direct links, navigation, crafted forms, Standard/Premium access, downgrades/account switches and retained Dashboard statistics.

```text
node --test booking-demo/tests/essential-package.mjs
node booking-demo/tests/essential-package-browser.mjs
node --test booking-demo/tests/business-website.mjs booking-demo/tests/website-images.mjs booking-demo/tests/website-images-sql.mjs
node booking-demo/tests/business-website-browser.mjs
```

Existing analytics fixtures explicitly use Standard so their chart and filter assertions continue to exercise an entitled plan. The scheduling plan return shape remains `{name, staffLimit}`; the separate `insightsAllowed` helper reuses that authoritative resolver.
