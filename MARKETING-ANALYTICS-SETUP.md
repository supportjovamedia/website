# JovaMedia visitor measurement

Status: integration prepared; GTM account/container created and verified as GTM-MDZ4RQQQ. GA4 and Clarity terms, IDs, account settings, live collection and saved funnel still pending. This document is not proof of a live installation.

Owner: support.jovamedia@gmail.com. Website: https://www.jovamedia.com. Use free GTM, GA4 and Microsoft Clarity plans. The user accepted GTM terms and created its container. GA4 and Clarity creation are paused before their separate terms acceptance, which requires action-time confirmation under the browser policy.

GTM installation: the consent-gated loader adds the vendor script to document.head. The vendor body noscript markup is placed at the beginning of the body via MarketingAnalytics after consent. It is absent for JavaScript-disabled visits because the browser cannot check the stored opt-in. Do not add an unconditional noscript iframe, which would contact Google before consent. GTM account ID: 6381766731; container ID: 266724068.

## Account configuration before enabling

1. GTM: account JovaMedia, country United Kingdom, Web container www.jovamedia.com. Keep anonymous data sharing off. Publish only a reviewed container. This code loads GA4 and Clarity directly; do not add duplicate GA4, Clarity or page-view tags to GTM. Sanitized jova_* data-layer events are available for future tags.
2. GA4: account JovaMedia, property JovaMedia Website, Europe/London, GBP, web stream https://www.jovamedia.com. Choose business objectives covering leads and traffic. Keep optional account sharing, Google Signals, advertising personalisation and user-provided data collection off. Turn Enhanced Measurement OFF: this integration supplies page views, clicks, scroll depth and form events explicitly. This prevents duplicate page views and unintended form/URL collection. Check retention and document the selected value here after saving it. Register generate_lead as a key event. Register channel, destination and form_id as event-scoped custom dimensions and percent_scrolled as a numeric event-scoped custom metric if needed in reports.
3. Clarity: project JovaMedia, website https://www.jovamedia.com, category matching business services. Require cookie consent and use Strict masking. Confirm forms remain masked. Do not install its snippet again via GTM. Check current recording retention in the account. Link GA4 only if needed after both projects exist; linking is not required for collection.
4. Set production NEXT_PUBLIC_GA_MEASUREMENT_ID, NEXT_PUBLIC_CLARITY_PROJECT_ID and NEXT_PUBLIC_GTM_ID from the actual accounts, then NEXT_PUBLIC_ENABLE_MARKETING_ANALYTICS=true. Keep NEXT_PUBLIC_ANALYTICS_DEBUG=false in production. Rebuild after setting NEXT_PUBLIC variables. No IDs have been invented or enabled in this change.

## Measurement and funnel

GA4 receives page_view, ui_click, select_content, contact_click, form_start, generate_lead, form_error and scroll_depth. Contact channels distinguish email, phone, WhatsApp and the contact page. Enquiry success is emitted only after /api/contact returns a confirmed success. A failed enquiry is never counted as a lead. Names, messages, emails, phone targets and arbitrary field values are not event parameters. Generic ui_click counts buttons/links; Clarity supplies visual click context.

In GA4 Explorations create a saved closed funnel named Website to enquiry:

1. Visit: event_name = page_view.
2. Service viewed: event_name = page_view and page_path begins with /services.
3. Contact viewed: event_name = page_view and page_path = /contact.
4. Form started: event_name = form_start and form_id = contact_enquiry.
5. Enquiry sent: event_name = generate_lead and form_id = contact_enquiry.

Allow indirect steps. Create a second open funnel Contact to enquiry (steps 3 to 5) so direct-to-contact visitors are represented. Compare session source/medium, country and device where supported. Phone/email/WhatsApp clicks show contact intent, not a confirmed sale. Do not label them as completed enquiries. Save funnels only after events and dimensions are visible in the account.

## Where to view data

- GA4 Realtime: recent active users and events. Traffic acquisition: session source/medium. Pages and screens: visited pages. Events/key events: engagement and confirmed enquiries. DebugView: controlled QA events when debug mode is enabled locally.
- Clarity Dashboard: traffic and behaviour summaries. Recordings: per-session replay. Heatmaps: clicks and scrolling. Filter by country, device, landing page or source to investigate the Sweden/USA visits. IP-derived country is approximate; direct/unknown referrers cannot always be recovered.
- GTM Preview/Tag Assistant: tag and data-layer diagnostics, not a visitor reporting dashboard.

## Consent and verification

The v2 consent key deliberately asks old visitors to choose again for the new replay purpose. No GTM, GA4 or Clarity script loads before acceptance or after rejection. Basic consent mode is used; there are no pre-consent Google measurement pings from this integration. Advertising stays denied. Withdrawal disables GA4, sends denial to Clarity, deletes accessible first-party analytics cookies and reloads. Booking/account routes, confirmation routes and client previews are excluded. GA4 URLs keep only bounded campaign labels; Clarity is skipped on unapproved query strings. Unknown, sensitive URL parameters and form values must never be used as campaign labels.

Before launch, use browser network tools and provider dashboards to verify:

- Fresh visit and Reject all: no Google/Microsoft tracking requests.
- Accept: one manual page_view per route, no duplicate installation, correct consent signals.
- SPA navigation: correct page paths; excluded booking/account routes unload tracking.
- Contact focus: form_start once; failed submission: no generate_lead; controlled successful submission: one generate_lead. Do not send an actual enquiry without a controlled inbox test.
- Withdrawal/expiry and blocked storage: tracking stops and stays off after reload.
- Clarity playback: masked form values and no private routes; GA4 DebugView: sanitized events.
- Mobile and desktop cookie dialog: readable controls and working rejection/settings.

Consent refusal, browser blockers and bots affect recorded totals. These tools provide observed sessions, not a guaranteed count of every human visitor. Collection begins after the approved integration is deployed; it cannot reconstruct old visits.

Website code must go through a feature branch and PR. Do not merge without explicit user authorization.
