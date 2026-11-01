# Business integrations and slot recovery

This backend is BYO credentials first. It does not implement OAuth, guest deposit Checkout, payment capture, payment webhooks or PayPal refunds. The existing JovaMedia subscription billing key is never used. No business credentials belong in salon settings, browser storage, logs or HTTP responses.

All operational switches are disabled by default. Tests use two fictional businesses, disposable local SQL and injected HTTP only. No provider account, email, payment or real customer data is required for tests.

## Server contract

All owner endpoints are POST JSON with `Authorization: Bearer <owner access token>`. Accepted browser origins are exactly `https://book.jovamedia.com`, `https://jovamedia.com` and `https://www.jovamedia.com`. Responses are private, `no-store` and never contain secrets. The server verifies the current native Auth user, confirmed email and `owner_account_access` before calling the private worker. SQL independently checks the verified owner and business, using the current billing ledger for recovery eligibility.

| Endpoint | Body | Result |
| --- | --- | --- |
| `/api/jovabook/integrations/status` | `{salon_id}` | Safe statuses for all five providers, `salon_id`, `recovery_available`, reason, latest 20 safe recovery action receipts |
| `/api/jovabook/integrations/connect` | `{salon_id,provider,credentials,expected_revision}` | `{ok,salon_id,integration}` after live read-only provider verification and encrypted storage |
| `/api/jovabook/integrations/disconnect` | `{salon_id,provider,expected_revision}` | Removes the stored credential and cancels outstanding recovery work for Mailchimp |
| `/api/jovabook/recovery/preview` | `{salon_id,booking_id}` | `{ok,salon_id,preview_id,expires_at,slot,business,candidates,subject,message}` |
| `/api/jovabook/recovery/send` | `{salon_id,preview_id,recipient_ids,include_offer,discount_percent,request_id}` | HTTP 202 `{ok,action_id,status}`. This means queued, not delivered. |
| `/api/jovabook/recovery/worker` | Empty POST, dedicated worker bearer | Claims one durable action, sends or reconciles, returns attempted count |

For a first connection, `expected_revision` is null or omitted. Replacing a connection requires the current revision from status. Disconnect requires that revision. Stale writes return HTTP 409. A failed verification keeps the previous credential. Disconnect removes JovaBook's copy; it does not revoke the credential at the provider or undo an already initiated campaign. Businesses can revoke keys in their own provider account.

Error shape: `{ok:false,code,message}`. Codes are `invalid_request` (400), `auth_required` (401), `access_denied` (403), `refresh_required` (409), and `unavailable` (503). Provider response bodies are never forwarded. Unsupported request properties are rejected, including arbitrary endpoints, HTML, prices and return URLs.

## Actual provider readiness

All safe provider results include `state`, `account_verified`, `checkout_ready`, `recovery_ready`, `reminders_ready` and `missing_requirements`. Stored timestamps are not sufficient to claim readiness: status rechecks provider access. `checkout_ready` and `reminders_ready` are always false in this release.

| Provider | Credential dialog fields | Read-only verification | Honest result |
| --- | --- | --- | --- |
| Stripe | `secret_key`, business restricted `rk_test_` or `rk_live_` key | `GET https://api.stripe.com/v1/account` | Account identity verified. Checkout is not implemented, regardless of account charge capability. |
| PayPal | `client_id`, `client_secret`, `mode` (`sandbox` or `live`) | App client-credentials token at the corresponding PayPal API origin | Credentials verified only. App authentication does not prove merchant onboarding or payment readiness. |
| Mailchimp | `api_key`, `audience_id`, `sender_email`, `sender_name`, optional `permission_id` | Account, exact audience and exact sender-domain verification/authentication | Recovery ready only when the domain is verified/authenticated and any audience marketing permission is configured. Each client is checked separately. |
| The SMS Works | `jwt` | `GET /v1/credits/balance` | Credentials verified. Existing globally managed reminder delivery does not automatically consume this BYO credential. |
| Twilio | `account_sid`, restricted `key_sid`, `key_secret` | `GET /2010-04-01/Accounts/{account_sid}.json`, matching active account | Account verified if the restricted key grants the required Account read permission. Standard keys exclude Accounts; permission failures are honest failures. No SMS delivery adapter is activated. |

Provider states: `not_connected`, `credentials_verified`, `setup_required`, `ready`, `unavailable`. Account IDs and app IDs are safe identity summaries, never evidence that customer checkout is available. A provider timeout cannot turn an existing connection into a fake success.

One-click Stripe Connect needs JovaBook platform registration and OAuth client/callback configuration. PayPal partner onboarding requires approved platform partner credentials and server merchant verification. Twilio Connect also requires a registered Connect application; Account OAuth supports client credentials rather than a user authorization-code flow. Those are separate future work, with no placeholder OAuth buttons in this release. Squarespace remains an ordinary copyable tenant booking iframe/link, not an authenticated integration.

## Recovery eligibility and consent

Recovery is paid Standard/Premium only, derived from the server billing ledger, never an edited workspace field. Essential stays email-reminder only. The booking must currently be cancelled, within the existing future 75-day booking window and still free under the actual service, staff, duration, hours, buffer and notice checks. The business must have a usable phone number.

The recent-client lookback is the preceding 75 business-local days, up to the current local time. A candidate needs a completed visit with the same current service, or a current service in the same nonempty category. Cancelled, uncompleted, future and older visits do not qualify. The cancelled customer is excluded by both customer ID and lowercase exact email. Email deduplication is case-insensitive only; provider-specific dot or plus normalization is not used. At most 100 candidates are returned per preview.

Booking emails and SMS reminder opt-ins are not marketing permission. Preview and worker both read the exact Mailchimp member. Provider lookups use at most eight concurrent reads and a 12-second audience deadline. Only `status: subscribed` qualifies, with the configured marketing permission explicitly enabled if supplied. No endpoint subscribes or changes a contact. A provider failure fails closed. Owners see only their own qualifying recipients; no cancelled-customer identity or private appointment notes appear in preview.

Preview expires in five minutes. Send accepts only server-previewed recipient IDs. Integer discounts 0 through 100 are optional, descriptive offers only. There is no online code, price mutation, rescheduling action, automated discount application or slot reservation.

Fixed message:

`We have a [service] appointment on [date] at [time]. [Optional: We are offering X% off this slot.] Call [business phone] and quote "[service], [date], [time]" to ask for this slot.`

Subject: `An appointment is available at [business name]`. HTML is escaped. Provider address and unsubscribe merge fields are appended. The business must keep its Mailchimp legal address/current audience data correct. The campaign checklist is checked before sending.

## Durable dispatch and uncertainty

The SQL gateway is `business_integrations_worker(p_token,p_action,p_payload)`. All tables are private, RLS-enabled and revoked from anonymous and authenticated roles. Only the dedicated hashed worker token permits the gateway. Credentials use AES-256-GCM with a random nonce and authenticated business/provider/version scope; a ciphertext cannot be moved between businesses or providers. Losing or rotating the encryption key without migration makes existing connections unavailable; reconnect under a new key only after cancelling/reviewing unfinished campaigns.

An expiring preview binds business, verified owner, cancelled booking, exact slot and credential revision. Enqueue freezes the authoritative context, selected recipients and offer. A unique business/request UUID plus request hash makes exact HTTP retries stable; a changed request with that UUID is rejected. A unique business/cancelled-booking constraint prevents a second campaign after reload or a different request UUID.

Worker claims use row leases and the same business advisory lock as booking writes. It checks current plan, connection revision, free slot and current recent-client eligibility before preparation and again before dispatch. Queued preparation older than 15 minutes is cancelled. Current Mailchimp subscriptions are checked twice, and the static segment member set must exactly match selected recipients. No new audience member is created.

Every non-idempotent provider mutation is durably marked before the HTTP call. A segment/campaign creation with unknown outcome is quarantined, with no automatic second creation. The campaign ID is stored before setting content or sending. Content, audience binding and readiness are checked before a single send request. An ambiguous send is reconciled by reading that same campaign ID, never by another send request. `sending` or `sent` at Mailchimp proves provider initiation, not recipient delivery. A campaign left as a draft after ambiguity needs review and is not resent automatically. External edits to the Mailchimp campaign/audience can still race a final provider request; businesses should not edit an in-flight recovery campaign. No cross-system lock can reserve the slot while email is travelling, so copy asks the recipient to call and check availability.

Stages: `queued`, `preparing`, `creating_segment`, `segment_saved`, `creating_campaign`, `campaign_saved`, `sending`, `unknown`, `sent`, `cancelled`, `needs_attention`. Unknown creation, expired in-flight leases, revoked credentials and changed campaigns require operator review. Disconnect may leave a provider draft/orphan static segment; it does not attempt destructive provider cleanup or a second send. No background deletion of provider objects is implemented.

## Required operational configuration

Before activation, separately review/apply the additive migration, deploy these routes, configure a scheduler and verify provider sandbox behavior. This source change does none of those hosted operations.

- `JOVABOOK_SUPABASE_URL` and `JOVABOOK_SUPABASE_PUBLISHABLE_KEY` point to the intended project.
- `JOVABOOK_INTEGRATIONS_WORKER_TOKEN`: dedicated random 64 lowercase hexadecimal characters. Store only its SHA-256 hash in `jovabook_private.integration_config.worker_hash`.
- `JOVABOOK_INTEGRATIONS_ENCRYPTION_KEY`: a separate random 32-byte key represented by 64 lowercase hexadecimal characters, server-only and backed up securely. Never reuse the worker token or a billing key.
- `JOVABOOK_INTEGRATIONS_ENABLED=true` and private SQL `integration_config.enabled=true` permit provider verification/connect. Both default off.
- `JOVABOOK_RECOVERY_ENABLED=true` and private SQL `integration_config.recovery_enabled=true` permit recovery. Both default off. Only enable after approval for real marketing sends and Mailchimp configuration/consent review.
- An authenticated scheduler POSTs the worker route with the dedicated bearer. No cron or provider account is created by this migration.

No operational credentials, switch changes, emails or paid resources were used to validate this implementation. Automated checks use `node --test tests/jovabook-integrations.test.mjs` with installed PGlite. Multi-connection PostgreSQL concurrency and real provider sandbox roundtrips remain release checks before activation.

## Official API references

- [Stripe account retrieval](https://docs.stripe.com/api/accounts/retrieve), [Connect OAuth](https://docs.stripe.com/connect/oauth-reference).
- [PayPal app authentication](https://developer.paypal.com/api/rest/authentication/), [partner seller onboarding](https://developer.paypal.com/platforms/seller-onboarding/before-payment/).
- [Mailchimp API keys](https://mailchimp.com/developer/marketing/api-concepts/authentication/api-keys), [sending domains](https://mailchimp.com/developer/marketing/api/verified-domains/list), [segments](https://mailchimp.com/developer/marketing/concepts/audiences/segments/), [campaign send](https://mailchimp.com/developer/marketing/api/campaigns/create-action-send).
- [Twilio key permissions](https://www.twilio.com/docs/iam/api-keys), [restricted keys](https://www.twilio.com/docs/iam/api-keys/restricted-api-keys), [Account OAuth](https://www.twilio.com/docs/iam/oauth-apps/account-oauth-apps).
- [The SMS Works API reference](https://api.thesmsworks.co.uk/docs/api-reference.html).
