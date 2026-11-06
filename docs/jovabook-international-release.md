# JovaBook four country release

Registration eligibility includes the UK, US, Canada and Australia, retaining the existing Crown Dependency aliases. The application reads Vercel's IP-country header in its existing region preflight. Hosted requests without a country fail closed, as do unsuccessful or malformed client preflight responses. This is an IP-based normal-signup eligibility check, not proof of residency or a security boundary around Supabase Auth. VPNs and direct Auth access are not prevented by this check.

Business setup supports validated country, IANA time zone and GBP, USD, CAD or AUD service currency. Existing businesses retain UK defaults. Appointments store business-local dates and times; the database rejects skipped or ambiguous DST slots and locks locale changes once appointment/payment history exists. Customer confirmations, management pages, reminders and owner clocks use the business zone. SaaS subscription billing remains GBP, independently of service prices and any display-only plan conversion.

## Release order

1. Review the forward migration and perform a controlled backup/rehearsal through the existing database workflow. This feature branch has not changed hosted data.
2. Keep SMS dispatch disabled during the provider transition. Apply the international migration before the new application worker, which uses its protected unavailable action and trusted business tags.
3. Deploy the reviewed application only after the migration and environment are ready. Use the pinned dependency versions for the clean build. Local reused dependencies reported Next.js 16.4.0, while the repository requests 16.4.3; do not call the older local CLI build a clean pinned build.
4. Configure the server-only PureSMS variables described in jovabook-puresms.md. Do not set approved-country flags until account, sender and multi-business-use approval are established. Missing key/sender/approval must not silently fall back to another provider.
5. Verify an approved transactional test before enabling a route. Provider acceptance, confirmed delivery, customer credit usage and provider cost are separate records. Do not automatically retry Unknown outcomes.

No hosted migration, production deployment, funds top-up, number rental or paid sender registration was performed while preparing this branch. Sender availability and any per-business number fees remain release prerequisites, rather than assumptions encoded in the product.

## Reminder credits and content

One customer reminder credit retains the existing one-reminder unit. The provider and safety budgets count SMS parts separately. Longer or Unicode text can consume up to three provider parts for one allowed reminder; existing retail prices and historical balances are not changed. The editor now distinguishes these terms.

Paid-plan owners can edit the existing reminder template. The optional timezone token is supported and included in the new default; stored templates remain valid. The current schedule remains one reminder approximately 24 hours before the appointment. Arbitrary owner-selected timing has not been added.

## Verification limits

Local SQL tests exercise real booking holds, proof-gated captures, owner access, locale locks, DST transitions, phone validation and unready-provider cancellation without a retail debit. Mocked provider tests never send live texts. Local UI fixtures use fictional data and remove real account configuration. Responsive verification uses a frame with its own CSS viewport, keeping the user's Chrome window available.

Production receipt of analytics events, actual SMS delivery and carrier approval require separate destination-side verification after an approved release. Keep tests separate from acquired businesses. Do not use broad crawls, hosted preview visits, load tests or new polling endpoints to perform that verification when hosting quota is constrained.
