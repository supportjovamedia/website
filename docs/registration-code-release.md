# Registration code release

Status: implemented and checked locally. This document is not a production deployment receipt.

## Changes

- Native Supabase email verification using a six-digit code in the original browser tab.
- White account screens, optional phone with calling code, UK default, password visibility, live password rules and required terms checkbox.
- One primary service, with a required description for Other. No related-service selector.
- Multiple service locations, optional existing website, current software and optional client CSV import.
- Mandatory final attribution question and a once-only welcome inside the first dashboard visit.
- Operator setup details include the additional saved fields and timestamps. Codes, passwords and CSV contents are excluded from diagnostics.

## Coordinated release

1. Review and merge the feature PR when approved. Obtain production deployment approval separately if necessary. Do not deploy the unchanged confirmation email before the code UI is available.
2. Apply `20261109151245_simple_primary_service.sql` through the existing migration process. Keep the applied remote migration version aligned with the committed filename.
3. Deploy the static `booking-demo` application, including all changed versioned scripts and CSS. The terms-page anchor is part of the marketing site deployment.
4. Set the Supabase Confirm Signup body to `docs/templates/jovabook-confirm-signup.html`. Keep Resend SMTP. Do not install a Send Email Hook as a quota guard: that hook replaces SMTP delivery for all Auth emails.
5. Verify native Auth produces six-digit codes. Preserve the existing native rate limits and use a short supported code expiry, preferably 10 minutes. Keep Google OAuth configuration and customer verification working.
6. Use one owned test inbox for the actual delivered email, successful verification, profile, setup and dashboard. No prospect or customer emails for testing. Confirm code reuse and expiry rejection without generating repeated send requests.

The template shows codes for email-first owners only and preserves link verification for legacy and customer accounts. Links remain an alternate route during the rollout.

## Send budget

`reserve_owner_verification` atomically reserves a request before registration calls native Auth. It permits three requests total per normalised email in a rolling 24-hour window, one minute apart, shared across browsers. Failed delivery attempts also use a reservation so a failed provider cannot cause a retry storm. The private table retains salted address hashes and request times only, removes expired rows on a later reservation and is not directly readable by anonymous or signed-in clients.

This is an application-flow limit, not an absolute Resend account quota. Supabase's public Auth endpoints can still be called independently. A provider-wide hard cap would need enforcement at the actual mail-sending boundary; do not claim that a preflight RPC prevents every possible external sender. Existing Auth rate controls remain necessary.

## Welcome behaviour

The first dashboard visit calls `claim_owner_welcome`. A single atomic update claims `welcome_seen_at` on the verified owner's private setup record. Further claims from any browser return false. Already completed accounts are marked at migration time and do not receive a retrospective welcome. Pending or unverified accounts cannot claim it. No polling is added. A claim failure leaves the dashboard usable and waits for a future page load to try again.

## CSV behaviour

CSV import is optional, accepts the downloadable name/email/phone template, and validates a maximum of 500 clients and 250 KB. It writes only to the verified owner's business. Existing matching contact details are skipped, not overwritten. The batch is atomic and retry-safe. It does not create bookings, send invitations, grant marketing consent or subscribe clients to anything. The CSV itself is not saved.

## Local evidence

Focused Node/PGlite tests cover native code verification, invalid/rate-limited/wrong-account cases, adoption retry, private owner data, multi-location validation, terms timestamp, CSV validation and ownership, duplicate imports, send reservations, diagnostics and once-only welcome claims. The local browser walkthrough used fictional records with external requests blocked. The primary-service cards and welcome dialog were checked at 320, 375, 426, 768 and 1280 pixel widths. The complete registration walkthrough used 390 pixels. No production crawl, load or performance tests were run.
