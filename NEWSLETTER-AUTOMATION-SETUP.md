# Connect the welcome sequence

The website now sends `newsletter.confirmed` to Resend after the customer presses Confirm subscription and their consent and segment membership have been saved. Checklist-only requests do not enter the sequence. Existing unsubscribe preferences remain respected.

## Activate

1. In Resend, open your automation and set its trigger event to exactly `newsletter.confirmed`. No event payload fields are required.
2. Connect the published templates: Welcome immediately → wait 2 days → Practical advice → wait 3 days → Project invitation. Keep the unsubscribe link in all three emails. Set Reply-To to support.jovamedia@gmail.com.
3. In Vercel's Marketplace, connect an Upstash Redis database to the website project. Use a separate database for Preview testing. Do not purchase a paid plan unless you choose to.
4. Add these server-only variables in the relevant Vercel environment:
   - `UPSTASH_REDIS_REST_URL`: the database's HTTPS REST URL.
   - `UPSTASH_REDIS_REST_TOKEN`: its REST token, saved as a Secret.
   - `NEWSLETTER_AUTOMATION_ENABLED`: `true` when ready to test/activate.
   The code expects these exact names. If the integration creates prefixed names, copy the matching REST values into these names. Keep all existing email and segment variables.
5. Start the Resend automation before enabling the website connection. An accepted event does not prove an automation was running. Use a separate test event/automation or controlled inbox during preview testing so real subscribers are not enrolled accidentally.
6. Redeploy the Preview with the variables. Subscribe with a test inbox, open its confirmation link, and press Confirm subscription. Check Resend Runs: there should be exactly one run with Welcome sent and the next step waiting. Confirm again: no second run. Test the checklist separately and verify no run is created. Test unsubscribe and ensure subsequent Send Email steps are skipped.
7. Once reviewed, merge this PR to main and deploy with the Production variables. Repeat the controlled inbox check on the live domain. Do not assume a template test proves the website connection works.

No template IDs, webhook, or Vercel cron job are needed: the event selects the active Resend automation, and Resend manages its delays. Publishing templates alone does not activate the sequence.

## Duplicate protection and recovery

Resend documents idempotency for email sends, not event sends. An atomic Redis SET NX records one attempt per email/segment for welcome-v1, across concurrent requests and server restarts. Records contain a hashed identifier and pending/sent state, not the email address. Keep the database persistent with no eviction of these records; deleting records removes duplicate protection. Use distinct Preview and Production databases.

A successful event becomes `sent`. Explicit 4xx rejection (except timeout) releases the record so a corrected confirmation can retry. Network failures, 5xx responses, and interrupted processes retain `pending`: the request may have reached Resend, so the code deliberately does not resend automatically. This favours avoiding duplicate sequences over guaranteed delivery.

For a pending record, check Resend Logs and automation Runs for that contact. If a run exists, mark the record `sent`. Only remove a pending record when you have established that the original attempt cannot still dispatch and no event was accepted; then have the customer confirm again using a valid link. Never bulk-clear records to resolve one failure. A record key is `newsletter:welcome-v1:` followed by SHA-256 of `<segment ID>:<lowercase email>`. Treat these hashed records as personal data for deletion/retention handling. Redis failures block event dispatch rather than bypassing duplicate protection.

Switch `NEWSLETTER_AUTOMATION_ENABLED` to `false` and redeploy to stop new website-triggered runs. Already-running sequences must be stopped in Resend separately. Previously confirmed contacts are not automatically backfilled. A contact who confirms again while this feature is enabled can enter once if no record exists.

## Validation limits

Automated tests mock Redis and Resend. They verify the event connection, consent gates, concurrency, retries and failure handling; they do not prove delivery or the settings in your Resend account. Run the controlled inbox test before promotion.

References: https://resend.com/docs/api-reference/events/send-event and https://resend.com/docs/dashboard/emails/idempotency-keys
