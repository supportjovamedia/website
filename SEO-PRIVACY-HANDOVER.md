# SEO, sharing and privacy handover

Prepared on branch fix/seo-consent-readiness from main faf622f. No production settings were changed.

## What changed
- Canonical URLs, sitemap, robots, service and organisation schema now use https://www.jovamedia.com, matching the existing live redirect.
- Organisation data describes the London/UK business and includes the social profiles already configured in lib/site.js.
- Fresh 1200x630 sharing image at /share/jovamedia-2026 uses the actual JovaMedia logo. Page Open Graph and Twitter tags reference it. The old image endpoint remains available.
- Analytics dynamically loads only after explicit acceptance AND NEXT_PUBLIC_ENABLE_ANALYTICS=true. Equal accept/reject choices; persistent footer settings; 180-day preference expiry.
- Each event checks consent again and removes query strings/fragments from its URL. Withdrawal reloads to remove the already-loaded runtime. Hosting/security request logs are distinct from optional analytics.
- Privacy page reflects the actual email-draft contact flow and analytics controls. Contact FAQs answer scope, costs, enquiry and privacy questions.
- Existing terms, CTA, favicon, 404, local fonts, responsive images, hero preload and service metadata are retained.

## Verified
Production build (with analytics enabled to exercise the gate), existing 11 tests, lint, consent browser tests (reject, accept, persistence, withdrawal, expiry and URL redaction), form preview, 36 internal link targets, alt attributes, and automated WCAG A/AA checks at 320, 390 and 1440px.
The analytics transport was stubbed during the browser test; no test visitor events were sent to Vercel.
Browser checks are not a claim of complete accessibility conformance or guaranteed search ranking.

## After approving and merging this PR
1. Keep the existing Vercel domain redirect to www; metadata is now aligned with it.
2. If optional analytics is wanted, set NEXT_PUBLIC_ENABLE_ANALYTICS=true in Vercel and rebuild. It remains consent-gated. Keep false for no analytics.
3. Verify ownership in Google Search Console for jovamedia.com. Submit https://www.jovamedia.com/sitemap.xml and request indexing for the homepage and About page. Confirm the chosen canonical after Google recrawls.
4. Test a fresh share of https://www.jovamedia.com/. Use Meta Sharing Debugger and LinkedIn Post Inspector to refresh their cached previews where applicable. Some messaging apps cache independently and cannot be forced by this code.
5. Report the inaccurate Google AI Overview through its feedback option. The screenshot describes jova.media in Mexico, a different domain. JovaMedia cannot directly edit Google's answer.
6. Review that every configured social profile belongs to this business. Supply the exact legal operator name, registration/address details if applicable, and actual provider/retention practices before calling the legal pages final. No business registration or retention period was invented.
7. The contact form still prepares an email draft. It is not server email delivery; connecting delivery requires an email provider and a separate implementation.
8. Recheck Vercel visitor collection on an approved production session: reject first, then accept, then withdraw.

## Reference
Google recrawl guidance: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
Google title links: https://developers.google.com/search/docs/appearance/title-link
Vercel analytics beforeSend: https://vercel.com/docs/analytics/package
