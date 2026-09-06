# Activate the checklist and newsletter

The branch adds a lower-homepage resource form and a quieter footer newsletter. It does not add a popup or publish articles. Start a Project remains the main homepage action.

## Resend
1. Verify the sending domain. Keep existing contact-form settings.
2. Use a server-only Resend API key with Full access: this integration sends emails and reads/writes Contacts. A sending-only key cannot confirm subscriptions.
3. Create a Segment called JovaMedia newsletter. Copy its ID.
4. Under Contact Properties create two STRING properties: newsletter_consent_at and newsletter_consent_version. The code records confirmed consent here.
5. Send marketing using Resend Broadcasts targeted to this segment and include Resend's unsubscribe link. Do not use the transactional email API for newsletters or add resource-only recipients to broadcasts.

## Vercel project Settings > Environment Variables
- RESEND_API_KEY: the Resend key (Secret; never NEXT_PUBLIC).
- RESOURCE_FROM_EMAIL: a verified sender such as JovaMedia <hello@jovamedia.com>.
- SITE_URL: https://www.jovamedia.com for Production; your branch preview URL for Preview.
- NEWSLETTER_TOKEN_SECRET: a random secret of at least 32 characters. Generate locally with node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Keep private.
- RESEND_NEWSLETTER_SEGMENT_ID: the segment ID.

Add Preview values first and redeploy that preview. Production values only take effect on a new production deployment. Production deployment still requires approval.

The PDF is included at /resources/digital-growth-checklist.pdf. No Blob account or database is needed. The URL is public and shareable; the email form is a delivery mechanism, not DRM or private file access.

## Verify before launch
- Request a checklist using your own inbox; check the PDF link and that no marketing contact is created.
- Subscribe using your own inbox; verify no Contact is added before confirmation. Open the link and press Confirm subscription.
- Verify the contact, segment and consent fields in Resend, then send a test Broadcast and test its unsubscribe link.
- Repeat confirmation after unsubscribing: it must not resubscribe you. Rejoining currently needs manual assistance after a fresh consent request.
- Check sender, reply handling, spam folder and Preview SITE_URL. The code tests use mocked provider responses and do not prove inbox delivery.

## Abuse protection and operations
The endpoint rejects foreign origins, oversized bodies and a honeypot, and applies a per-instance 8-request/10-minute IP limit. Memory limits are not global on serverless. Before public promotion, configure a Vercel Firewall rate-limit rule for POST /api/growth or add a durable limiter/challenge. Monitor Resend usage and bounces. Avoid logging request bodies or confirmation links. No actual email was sent by the automated checks.

The footer-v1 consent wording is: By subscribing, you agree to receive JovaMedia marketing emails. Confirm by email; unsubscribe anytime. The confirmation screen specifies growth, creative, media and technology.

## Welcome automation
To connect the three published templates, follow [NEWSLETTER-AUTOMATION-SETUP.md](NEWSLETTER-AUTOMATION-SETUP.md). This optional sequence requires shared Redis storage for duplicate protection; the resource and basic signup above do not.
