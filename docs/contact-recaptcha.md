# Contact form reCAPTCHA

The contact form requires Google reCAPTCHA v2 (the "I'm not a robot" checkbox). The server verifies each token before forwarding the enquiry through Resend. Missing configuration, rejected tokens and Google outages stop delivery and show an email fallback.

## Production setup

1. Register a v2 checkbox site for `jovamedia.com` in the JovaMedia Google account. Keep Google domain validation enabled. The parent domain covers `www.jovamedia.com` too.
2. Keep the Google Cloud project on the free plan with no billing account attached. Do not enable billing or a paid upgrade without the owner's explicit approval. The free allowance is 10,000 assessments per month across the organization; exceeding it stops verification rather than authorizing charges.
3. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and the server-only `RECAPTCHA_SECRET_KEY` in the Vercel production environment. Never put the secret in a public variable, source control or a PR.
4. Deploy after setting the variables. Next.js embeds the public site key during the build, so changing it requires a new build.
5. Confirm the widget renders on `/contact` and a request without a valid token cannot send email. Complete one real enquiry after verifying the checkbox to check the full delivery path.

Production accepts only `jovamedia.com` and `www.jovamedia.com` in Google's verified hostname. The standard Google test secret is rejected when `VERCEL_ENV=production`.

## Local and preview checks

Use separate development keys, or Google's public test keys from its FAQ, only in an isolated local/preview environment. Add that environment's exact hostname to `RECAPTCHA_ALLOWED_HOSTNAMES`. Google's public test pair reports `testkey.google.com`, which must be explicitly allowed for those isolated tests. Never use test credentials in production.

For a real preview, register its exact hostname on a separate development key and in `RECAPTCHA_ALLOWED_HOSTNAMES`. Do not disable Google's domain validation or broadly allow all `vercel.app` hosts. Preview environment variables can be restricted to this branch.

The client removes Google's injected `g-recaptcha-response` field from the stable enquiry identity. Every server attempt resets the widget, but a fresh token for unchanged enquiry fields retains the same Resend idempotency key. This prevents duplicate email after an uncertain delivery result.

## Verification

Run `npm test`, `npm run lint` and `npm run build`. The verification tests cover rejected, missing, malformed, expired and duplicated tokens, unexpected hosts, upstream failures, production test-key protection and retries after uncertain email delivery.

Official references: [v2 display](https://developers.google.com/recaptcha/docs/display), [server verification](https://developers.google.com/recaptcha/docs/verify), [test keys](https://developers.google.com/recaptcha/docs/faq), [billing and free allowance](https://docs.cloud.google.com/recaptcha/docs/billing-information).
