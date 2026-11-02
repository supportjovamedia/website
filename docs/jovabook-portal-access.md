# JovaBook portal separation and operator support

Customer and business identities share the hosted Auth service, but private database roles make their portal access exclusive. A valid Auth password alone never grants customer, owner or operator data access. Editable user metadata does not grant any role.

## Customer portal

- The verified identity is checked by portal_identity before a profile or private booking is loaded.
- An owner/operator identity is rejected and its customer-tab session is removed, without signing the owner out elsewhere.
- Existing memberships are loaded from customer_portal_profile before asking for profile details. Signup metadata is used only to prefill a new profile.
- Business creation and customer membership triggers enforce persistent exclusive roles under a per-identity transaction lock.
- Existing owners have precedence during migration. Existing customer membership rows are preserved.
- Direct membership table reads are revoked. Customer RPCs validate the confirmed email and business membership.
- Recovery screens recheck the customer role, including before changing a password. Native Auth still owns password storage and email verification.
- Server cancellation rules and refund jobs are unchanged. Cancellations inside 24 hours are rejected by the server. This release does not enable live money collection.

## JovaMedia back office

URL: https://book.jovamedia.com/operator.html

Only the confirmed Auth email support.jovamedia@gmail.com is authorised by the private operators table. There is no metadata flag, public grant-role RPC or shared hardcoded password. New account creation still requires email verification; an arbitrary signup cannot grant operator access. The operator must create their own password.

Features: searchable business directory, plan/cadence, trial expiry, access state, paid-until date, scheduled cancellation state, setup counts, business contact details, public website link, support notes and recorded support views/actions. Owners continue cancelling subscriptions in their own Subscription page. This release gives operators no Stripe mutation, refund, impersonation or deletion action.

Operator sessions use a separate sessionStorage key. Logging out does not remove owner/customer sessions. Each directory, detail and note request rechecks the verified allowlist. No bank/card details, provider credentials, private customer notes or passwords are returned.

Notes use an idempotent request ID so a lost response can be retried without creating duplicate notes. Unsaved notes prompt before leaving. Revoking the allowlist entry or removing email verification blocks subsequent requests even with an existing access token.

## Validation

The full offline migration chain runs in isolated PGlite. SQL tests exercise cross-role and cross-business denial, unverified/anonymous denial, role claims, trigger enforcement, customer cancellation, operator revocation, note idempotency and private helper/table grants.

Browser interaction tests use intercepted fictional APIs, with all unexpected outbound requests rejected. Operator tests cover login denial, search/clear, detail, note validation, unsaved-note prompts, lost-response retry, escaped note content, logout and 1440/390/360px layouts. Customer tests cover login, profile, booking isolation, cancellation, recovery, payment page safety and owner-session isolation.

Live payment collection and real password changes are not part of these tests. The selected operator account must be created/verified by its owner before live operator sign-in can be checked.
