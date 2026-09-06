# Contact email delivery setup

Branch: feature/contact-email-delivery. Based on latest main af7dc57.
This PR replaces the email-draft form with server-side Resend delivery. It does not provision a Resend account or change production environment variables.

## Activate
1. Create/use a Resend account and verify a sending domain using its DNS instructions. This does not require moving your Gmail inbox or changing your website host.
2. In Vercel Project Settings → Environment Variables, add server-only values:
   - RESEND_API_KEY: a Resend sending key (never NEXT_PUBLIC_).
   - CONTACT_FROM_EMAIL: a sender on the verified domain, e.g. JovaMedia Website <enquiries@jovamedia.com>.
   - CONTACT_TO_EMAIL: support.jovamedia@gmail.com, or the agency inbox you choose.
3. Apply to the intended environment and redeploy after the PR is approved. A scoped preview key/sender may be used to verify the preview first.
4. Submit a controlled test with an email address you own. Check the destination inbox and Resend delivery status, then reply to confirm the visitor reply-to address works.
5. Review spam/junk and provider failures. Provider acceptance is not a guarantee that a receiving inbox cannot subsequently bounce or filter a message.

## Visitor experience
Send enquiry → Sending… → green receipt with a 1–3 working day reply expectation.
Failures keep the entered values and show an accessible error plus direct email fallback. No success is shown on missing configuration, timeout, malformed response or provider rejection.
This is an on-page acknowledgement, not a separate email autoresponder.

## Protection and limits
Server validation, 16KB body cap, origin checking, honeypot, bounded in-memory request throttling, fixed configured recipient, plain-text email, no enquiry/secret logging, provider timeout and stable idempotency key for retries.
The in-memory throttle is best-effort per server instance; configure Vercel Firewall rate limiting for /api/contact if stronger distributed abuse protection is needed.
No mail provider keys are committed. No visitor enquiry fields are added to analytics.

## Validation
Unit tests mock the Resend transport and cover success, retry identity, missing configuration, provider errors, malformed input, origin checks, body size and throttling.
Browser success/error states use an explicitly mocked local API response. Live inbox delivery needs the account configuration and controlled test above; it was not claimed or simulated as a real submission.
The privacy page and contact FAQ now describe server email delivery.

This supersedes the email-draft limitations in SEO-PRIVACY-HANDOVER.md.
