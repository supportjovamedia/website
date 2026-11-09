# JovaBook signup and onboarding revision, 9 November 2026

## Approved direction

Use JovaMedia branding and a restrained, responsive progress flow inspired by the supplied screenshots. Do not copy Fresha branding or pricing. Google and email only; no Apple membership or SMS login spend.

1. Email-first entry, plus Continue with Google. Do not request name or business information on this screen. Existing email login must remain possible without a forced new account. Do not disclose publicly whether an email already has an account.
2. Account details: first name and last name required, mobile optional, country required. Password required for email/password signup, never a second password for an already authenticated Google account. Preserve supported-country server eligibility. Keep existing verified accounts and passwords working.
3. Native email verification for email signup. Persist submitted profile fields in Auth/SQL before verification. Google identity must be verified server-side, never by trusting callback or browser claims.
4. Business details: business name, generated editable booking address, optional referral code. Availability and referral validity remain server checked. No subscription/seat grants from submitted metadata.
5. Business profile: primary category with optional related categories, team size, physical/mobile/online service location. Include actual JovaBook service audiences beyond beauty: tutors, photography, personal training and appointment-based professional services. Team size describes the business only and does not choose/charge a plan.
6. Optional final attribution: How did you hear about JovaBook? Search engine, Instagram, Facebook, Nextdoor, other social media, AI assistant (ChatGPT/Claude/Gemini/other), friend or colleague, review/directory, other. Allow skipping. Keep self-report separate from measured campaign attribution.
7. Success: Your workspace is ready. Add your services, address and opening hours from your dashboard. CTA: Open dashboard. Account/business creation is complete, not a claim that the booking page is ready for clients.

## Dashboard entry

Do not force address, phone, opening hours, service creation or payment before viewing the dashboard. Show actionable setup steps inside it. No publicly bookable slots until the owner deliberately supplies actual availability and an active service. No invented business/staff/client data in live accounts. Preserve existing subscription and tenant protections.

## Data and support

Save submitted steps in SQL with server timestamps. Do not capture unfinished keystrokes or passwords in support logs. Operator Overview must distinguish account created, verified, business created, configured/bookable, first booking and paying customer. Show names/email, profile fields, times and technical errors where identifiable. No automatic marketing consent from registration.

## Google connection

Live auth settings checked on 9 November: Google disabled, email enabled. User says no existing Google Cloud OAuth app and requests setup assistance. Need basic openid/email/profile only. Never request Gmail, Drive, Calendar or contacts access for login. No secret in chat or repository. OAuth setup is not yet complete.

## Competitor references retained for later

From the supplied screenshots: Acuity, Booksy, Faces, Goldie, Kitomba, Mindbody, Ovatu, Pabau, Phorest, Salon Iris, Setmore, Shortcuts, Slick, Square, Timely, Treatwell, Vagaro, Zenoti. Also Fresha, which supplied the reference flow. Include I am not using any software and Other if this becomes an optional onboarding question. Do not add a comparison claim without checking current official UK terms.

## Status

This file records the agreed flow. The new email-first wizard and Google OAuth are not implemented or live yet. Separate work in this branch implements the returning verified-owner repair, signup Overview and bounded operational diagnostics; those also await PR review/release.
