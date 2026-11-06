# JovaBook PureSMS configuration

This release prepares UK, US, Canadian and Australian phone routes and selects PureSMS by default. Business registration is separate from SMS readiness. No country is approved for SMS by default. A missing PureSMS key or sender never activates The SMS Works as an automatic fallback. The code change alone does not establish an approved account, successful send or delivery. Live credentials, SaaS use case and destination senders must be verified before enabling dispatch.

## Server configuration

Set these only in the server environment, never in NEXT_PUBLIC variables or booking-demo files:

| Variable | Purpose |
| --- | --- |
| JOVABOOK_SMS_PROVIDER | puresms for the new provider; smsworks only for an explicitly selected legacy rollback |
| PURESMS_API_KEY | Existing PureSMS/Divergent workspace API key with permission to send SMS |
| PURESMS_UK_SENDER | Approved platform sender for UK destinations |
| PURESMS_US_SENDER | Approved numeric platform sender for US destinations, in +1 international format |
| PURESMS_CA_SENDER | Approved numeric sender for Canadian destinations, in +1 international format |
| PURESMS_AU_SENDER | Approved sender for Australian destinations |
| PURESMS_APPROVED_COUNTRIES | GB, US, CA and/or AU, added only after that destination's account, SaaS use case and sender route are approved |
| JOVABOOK_SMS_ENABLED | Existing independent dispatch switch; keep false until account, country routes and budgets are ready |

The existing worker token, database readiness, plan entitlement, customer consent, business setting and segment budgets continue to apply. An API key or sender string alone does not enable a country: PURESMS_APPROVED_COUNTRIES must explicitly include it after approval is checked. A business-provided display sender cannot override the verified platform sender. This setup does not purchase phone numbers, create recurring add-ons or imply that a separate paid number is needed for each business. Confirm the provider's available shared/platform route and any charges before accepting an add-on.

PureSMS advertises all four destinations. US and Canadian destinations do not accept a generic alphanumeric sender in this integration. Sender registration or approval must be confirmed for each destination and for JovaBook's actual use case: sending booking reminders on behalf of independent businesses. An approved JovaMedia sender alone does not establish approval for every business brand. The provider may reject a country or use case even when credentials are valid. Do not mark a country approved until that scope has been confirmed.

## Business usage and credits

The stable API accepts clientTag for SaaS usage reporting. Each send derives a tag from the trusted business UUID in the database worker payload, in the form jovabook-UUID. Arbitrary client labels, owner names, customer emails and other typed values cannot supply the tag. Missing or invalid business identity blocks a PureSMS request. This tag supports provider cost reconciliation; it is not a separate provider wallet or proof of a purchased JovaBook credit balance.

JovaBook's existing queue has independent global and per-business segment safety budgets. The older plan allowance and purchased-credit ledger charge one unit per job, while the provider may bill multiple segments for a long or Unicode message. Align the product's advertised credit unit, reservation/refund ledger and provider segment accounting before presenting credits as one segment each. This provider adapter does not change customer billing or credit prices.

## Phone handling

booking-demo/sms-phone.js provides the browser phone parser. lib/jovabook-phone.mjs contains equivalent server rules, with parity verified across the NANP area prefixes and country-format fixtures. Both normalise supported international numbers to digits-only E.164 for the database; the provider request restores the leading plus. National numbers require the business/default country, while legacy UK 07 numbers remain supported. US and Canadian +1 numbers are distinguished using pinned mobile-number plan metadata, so a Bahamas, Jamaica or Puerto Rico +1 number does not become an allowed US route accidentally.

Dial-plan validation does not prove that a number exists, is currently a mobile number after porting, or has consented. No paid lookup or new runtime request is added. Review the pinned numbering metadata when a newly allocated area code is needed. NANP patterns are derived from Google's Apache-2.0 libphonenumber metadata, revision 5ea78f46ccc1a258012344801ce04eb6eb4c55da: https://github.com/google/libphonenumber/blob/5ea78f46ccc1a258012344801ce04eb6eb4c55da/resources/PhoneNumberMetadata.xml. Licence: https://github.com/google/libphonenumber/blob/5ea78f46ccc1a258012344801ce04eb6eb4c55da/LICENSE.

## Acceptance and delivery

The adapter uses the documented stable POST https://connect-api.divergent.cloud/sms/send endpoint and X-Api-Key authentication. Appointment reminders are sent as Transactional and provider link shortening is disabled. Each attempt makes one provider POST.

A successful HTTP response must include a valid provider message ID before the existing queue records Sent. Sent means provider acceptance, not delivery to the handset. Timeouts, server errors and success responses without a usable ID become Unknown. No synthetic provider ID is created and these attempts are not automatically resent. Known rejection responses become Failed.

The worker checks a prepared message against the provider's local destination, sender approval and trusted-business requirements before the database begin action. An unavailable route calls the protected unavailable action, cancelling an unattempted job and releasing its segment reservation without debiting a retail reminder credit. It makes no provider request. The existing begin action still rechecks consent, revision and budgets immediately before any actual send.

The stable adapter does not claim a verified balance or delivery lookup. The status response returns credits:null, provider_verification:not_checked and delivery_verified:false for PureSMS. provider_configuration_ready and configured_countries describe local configuration only. provider_ready is unknown when configured, and false when no usable configuration exists. A real approved test send and provider receipt are still required before claiming operational delivery. The existing queue lease and finish protections prevent an uncertain attempt being recycled into another send.

## Release verification

1. Confirm account access, SaaS use case and destination approval for the four routes. Do not create paid or recurring services without explicit approval. Signup access does not imply SMS approval.
2. Install the reviewed database and application changes together, preserving existing UK settings and historical delivery records.
3. Check protected status with dispatch off. Verify budgets and each configured country without claiming that configuration proves delivery.
4. Use provider simulator/test mode where supported. Confirm provider acceptance and final delivery separately using explicitly approved test numbers before any paid test send.
5. Enable dispatch only for routes whose sender, consent, recipient handling and reminder time-zone behaviour have been verified. Observe Unknown outcomes and do not resend them automatically.

Official references checked on 6 November 2026:

- https://the.divergent.guide/connect/sms/send-single-sms/
- https://puresms.uk/solutions/saas
- https://the.divergent.guide/connect/sms/senders/
- https://puresms.uk/destinations/united-states
