# JovaMedia enquiry funnel

Measurement runs after optional analytics consent on public marketing pages. Visitors who reject consent or block analytics will not appear. Counts are aggregate and pseudonymous, not a list of identified people. Form values are never sent to GA4, GTM or Clarity.

## Funnel events

| Event | Meaning |
| --- | --- |
| `page_view` | Public page visit, including home, about, services, pricing, contact and Get a Quote |
| `cta_click` | Contact Us or Get a Quote link clicked; includes destination and header, hero, content or footer placement |
| `select_content` | Internal navigation or outbound link clicked |
| `contact_click` | Email, phone, WhatsApp or Contact Us link clicked |
| `scroll_depth` | 25, 50, 75 or 90 percent of page scrolled |
| `form_start` | Visitor focuses an enquiry, quote, newsletter or checklist form |
| `form_input` | First typing or selection in each form on a page visit |
| `form_field_complete` | First non-empty, browser-valid field on blur; field name only |
| `form_attempt` | Submit action attempted, including custom validation failures |
| `form_validation_error` | Invalid input or missing CAPTCHA; field name and error stage only |
| `form_submit` | Valid form passed to delivery |
| `form_error` | Delivery could not be confirmed |
| `generate_lead` | Server confirmed successful Contact Us or Get a Quote delivery |
| `newsletter_signup` | Confirmation email request accepted, not confirmed marketing consent |
| `resource_request` | Checklist delivery request accepted |

`quote_click` and `view_item_list` also remain available for product enquiry detail. Do not add duplicate GA4 or Clarity page-view tags in GTM. The website owns these integrations.

GA4 receives event parameters. GTM receives the same events prefixed `jova_`. Clarity receives generic events and form-specific events, for example `form_input_quote_callback` and `generate_lead_contact_enquiry`, plus safe custom tags for page path, form, placement, destination, field name, error stage and campaign source. These can filter the matching session recordings. All forms remain masked. Client previews, accounts and booking flows are excluded.

## Campaign links

Use one unique `utm_content` for each actual post, profile link or gig. Use lowercase labels with underscores and no personal information. These links do not publish anything.

| Channel | Starter link |
| --- | --- |
| Facebook | https://www.jovamedia.com/?utm_source=facebook&utm_medium=social&utm_campaign=studio_launch&utm_content=post_01 |
| Nextdoor | https://www.jovamedia.com/?utm_source=nextdoor&utm_medium=social&utm_campaign=studio_launch&utm_content=post_01 |
| Reddit | https://www.jovamedia.com/?utm_source=reddit&utm_medium=social&utm_campaign=studio_launch&utm_content=post_01 |
| Upwork | https://www.jovamedia.com/?utm_source=upwork&utm_medium=referral&utm_campaign=studio_launch&utm_content=profile |
| Fiverr | https://www.jovamedia.com/?utm_source=fiverr&utm_medium=referral&utm_campaign=studio_launch&utm_content=profile |

After consent, safe campaign labels persist in session storage during internal navigation and accompany later form events. A newly tagged landing link replaces the stored campaign. Withdrawal clears that storage.

## Received enquiry source labels

Contact, free consultation and quote callback forms optionally include the same campaign labels in the business notification email. This makes a tagged social visit that becomes a received enquiry visible in the inbox, separately from analytics events. For example, an accepted TikTok campaign visit followed by internal navigation to Contact Us can append:

```text
Marketing source (optional, visitor-reported):
source: tiktok
medium: social
campaign: design-showcase
content: three-industries-01-trending-sound
```

The browser checks current optional measurement consent at submission time and omits attribution for missing, expired or declined consent. The server independently filters the optional object to source, medium, campaign, content and term. Each label is at most 100 ASCII letters, numbers, dots, underscores or hyphens. URLs, email addresses, newlines and extra fields are discarded. Missing or invalid attribution never prevents delivery, and no source is invented for an unattributed enquiry.

The source labels are visitor-reported, not independently verified acquisition data. Record the actual received conversation in the lead register and qualify it separately. Do not treat a provider receipt or `generate_lead` as a qualified sales lead, call, proposal or paid project. Direct emails, DMs, blockers, consent refusal and cross-device journeys can remain unattributed.

Retries retain the initially captured source labels while consent remains accepted, alongside the existing enquiry retry identity. A new campaign must not produce a second email merely because a visitor retries the same form. Withdrawal suppresses optional source data even during a retry.

Source tests cover consent, internal navigation, malformed labels and contact, consultation and quote notification payloads using local fake provider receipts. They send no actual emails. After merge and deployment, verify the full tagged visit, consent choice, internal navigation, CAPTCHA, business inbox receipt and analytics event. The pending PR and its preview are not evidence of production delivery or complete attribution.

## Dashboard setup and verification

GA4 property: measurement ID `G-YGPGYJ9L9B`. GTM container: `GTM-MDZ4RQQQ`. Clarity project: `yvnjaisape`.

Mark `generate_lead` as the enquiry key event. Use `form_id` to separate contact and quote requests. Register event-scoped custom dimensions for `form_id`, `placement`, `destination`, `field_name`, `error_stage`, `campaign_source`, `campaign_medium`, `campaign_campaign`, `campaign_content` and `campaign_term` if they are not already present. Standard acquisition reports also use landing URL UTMs.

Build an open funnel: page view, CTA click, quote or contact page view, form input, form submit, generate lead. Break down by campaign source and form. Use Clarity form-specific events to inspect sessions that started typing but did not reach a successful delivery.

Dashboard configuration and live event receipt must be verified separately from source tests. Custom dimensions apply to newly collected events, not historical missing data. Browser privacy settings, blockers, consent and reporting delays prevent a promise of complete visitor coverage.

## Verification on 11 October 2026

- GA4: all 10 event-scoped dimensions registered; `generate_lead` verified as a key event.
- GA4 Realtime received preview `cta_click`, `form_input`, `form_field_complete`, `form_attempt` and campaign context after a tagged entry and internal navigation.
- Clarity: saved `Enquiry journey to successful delivery` with page_view, form_start and generate_lead. The older Homepage to contact funnel is retained. New API events and form-specific variants become selectable as Clarity processes them; do not substitute its automatic Submit form event for successful delivery.
- Contact and quote production tests reached the business Gmail inbox. PR 58 removes obsolete fields from the contact notification template.
- Contact alignment checked at 320, 390, 768 and 1536 CSS pixels; navy text contrast audited across main marketing pages. Production build and 56 focused tests passed.
- Free Upstash database restored from the 7 October backup and connected only to JovaMedia Production and Preview. PR 58 uses its managed integration credentials. Preview email delivery is disabled by missing production-only email configuration, so the welcome automation receipt still needs a production test after merge.
- PR 58 requires explicit merge approval. Its Ready Vercel preview does not mean the source changes are live on the production domain.
