# Operator signup Overview and diagnostics

## Behaviour

Overview now reports account creation, verified email, business creation and first recorded booking separately. It includes business-intent Auth accounts without a salon row, with submitted name/email, signup/verification/last-sign-in timestamps, entered business details when available, stage filters and search. All times are Europe/London. Account rows are not a claim that a visitor is independent, activated or paying.

Owner signup now stores submitted business_name, booking_slug and signup_intent alongside owner_name in Auth metadata. These are display/profile fields, never authorization. Existing customers, staff logins and allowlisted operators are excluded from the business-intent cohort. Future Google/email-first onboarding must set an explicit business-intent display signal or linked business after successful identity verification; provider identity alone grants no business role.

Verified owners with no business can explicitly complete a blank business form when no safe local signup draft exists. Stale/foreign drafts are discarded. Existing fresh matching drafts still resume. The server identity, verified email and current no-business access are checked again before creation. This repair does not establish why particular historical accounts stopped.

## Operational logs

The browser reports only allowlisted step/code/HTTP-status classifications with a random per-event deduplication ID. A signed request is associated with auth.uid() by SQL, never a supplied user ID. Before authentication the report is anonymous. Reports are client-supplied observations, not authoritative conversions. Supabase native Auth audit logs are separate.

- Private table: jovabook_private.owner_flow_events, RLS enabled, no browser direct read/write grants.
- Narrow write RPC: report_owner_flow_event(uuid,text,text,integer), callable anonymously with no names/email/message inputs or reads.
- Operator read RPC: operator_owner_flow_events(), requires the existing verified operator guard.
- At most 10 browser reports per loaded page, duplicate suppression for 60 seconds, 2.5-second best-effort timeout, no retries or interval polling.
- Database maximum 40 reports/minute and 2,000/day across all reporters, 20/15 minutes per authenticated identity. A try-lock serializes the cap without waiting. Caps can suppress reports under abuse; this is intentionally best effort.
- Thirty-day rolling retention, purged on read/write. When the existing hosted pg_cron extension is installed, the migration also schedules daily SQL deletion at 03:17. Local databases without pg_cron rely on access-time deletion; production release must confirm the daily job.
- Passwords, access/refresh tokens, raw error messages/stacks, URLs, IPs, device IDs, form contents and unfinished keystrokes are excluded from these logs. Existing infrastructure/Auth provider logs are separate.
- No GA4/Clarity runtime is introduced in the booking app. No logging request goes through the Vercel website or its CDN. Existing browser reporting is direct to the configured Supabase host.
- Offline failures, extension blocking, expired sessions and provider outages can prevent delivery. Missing reports do not prove no error occurred.

## Release order

1. Review this PR and obtain merge authorization.
2. Inspect current hosted schema and apply 20261109031716_operator_signup_flow.sql, then 20261109033558_owner_flow_errors.sql.
3. Confirm anon cannot read either private records or operator RPCs, ordinary authenticated identities cannot read operator RPCs, and the existing operator guard remains intact. Confirm purge cron exists.
4. Merge reviewed source and explicitly deploy the booking-demo static Vercel project, which has historically not auto-deployed from pushes. Deploy the website privacy wording separately through its normal project.
5. Use a small read-only release check, not a live crawl/regression/load test. Missing RPCs are explicitly unavailable in the UI. No historical reports or errors are invented/backfilled.

## Validation performed locally

25 focused unit/SQL checks passed, including unknown draft continuation, account-switch/logout isolation, actual verified identity, region failure closure, operator-only reads, no direct log reads, write deduplication/caps/retention, no secret/form-content in reports and rendering/escaping.

Actual local Overview checked at 1280, 430, 390 and 320 pixels. Search, pending-stage filtering, report expansion, empty and unavailable states were exercised. No page overflow at checked widths. Screenshots contain fictional fixture accounts only. The broader browser regression suite and live tests were not run.

ESLint excludes booking-demo by project configuration. JavaScript syntax checks and focused executable tests passed; no claim of lint coverage for excluded files.

The proposed email-first/Google onboarding flow is documented in jovabook-onboarding-revision-2026-11-09.md and is a subsequent implementation, not part of this completed repair.
