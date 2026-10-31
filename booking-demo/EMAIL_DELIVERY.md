# JovaBook email delivery

Booking database: `rffsulstatmwzvrdgvec`. Customer app: `https://book.jovamedia.com`.
The main JovaMedia server hosts `/api/jovabook/email/worker` and `/api/jovabook/email/webhook`, reusing its existing server-only Resend connection.

## Behaviour

- A committed new booking generates one activity event and delivery jobs for customer and business owner.
- Updates and cancellations cancel obsolete queued messages and generate current updates.
- Customer-only reminders are due 24 elapsed hours before the booking, using the diary's Europe/London timezone, including DST. Bookings made inside that window receive their confirmation without an immediate duplicate reminder.
- Deleting a mistaken booking record cancels its pending messages but sends no new email, matching the owner delete confirmation.
- The scheduler processes up to five messages each minute. No browser sends email or holds provider credentials.
- Sent means provider acceptance. Delivered means the receiving mail server accepted the message; it does not mean the message was read or placed in the inbox.
- Old bookings and preview records are not backfilled. Browser-only demo records never enter this queue.

## Security and retry contract

`email_log` is readable only by the owning salon and is no longer client-writable. The private queue/configuration is not exposed through the Data API. A narrow worker RPC authenticates a random 256-bit token before any operation; it does not grant the website a project-wide service-role key. The token hash is stored in private configuration; the scheduler's token is kept in Supabase Vault and Vercel's sensitive environment storage.

Workers use transactional leases and freeze the exact Resend payload before sending. Retries retain both payload and idempotency key, stop after eight attempts, and never automatically cross the provider's 24-hour idempotency retention window. Booking state is checked before claim and preparation. A message already handed to the provider cannot be recalled; its actual send result is retained. Provider callbacks and acknowledgement use the same advisory lock, and early callbacks are buffered until they can be matched. Signed callbacks are replay-safe and reject stale request timestamps. Bounced/suppressed recipients are not automatically retried for new bookings.

## Deployment

1. Run the isolated SQL, sender, UI and browser tests. Use the feature branch and PR workflow.
2. Configure these **production-only** variables on the main `project_jovamedia` Vercel project: `JOVABOOK_SUPABASE_URL`, `JOVABOOK_SUPABASE_PUBLISHABLE_KEY`, `JOVABOOK_EMAIL_WORKER_TOKEN`. Keep the existing `RESEND_API_KEY`. Never publish the worker token or store it in source.
3. Merge and deploy the frontend and the main server. Apply the timestamped delivery migration, initially paused. Create the worker token in Vault and set its hash in private configuration.
4. Apply the scheduler migration. It exits without network requests while delivery is paused.
5. Call the protected worker's `setup` action to configure the signed Resend webhook. Existing matching hooks are checked and enabled with the required event subscriptions.
6. Call `self-test`. It sends only to the official Resend delivered and bounced simulator addresses, then inspect probe status through `status`. It cannot accept an arbitrary test recipient.
7. Enable private configuration only after provider tests pass. Verify one scheduled run, public endpoints reject unauthorised calls, owner status reads are tenant-scoped, and both web deployments serve the merged commit.

Pause outbound delivery with `update jovabook_private.email_config set enabled=false where singleton`. Pending jobs remain stored; the scheduler and worker will not claim new work while paused. Do not roll the frontend back to a version that writes `email_log` without a reviewed corresponding database rollback.

The SMTP setting for Supabase account recovery emails is a separate configuration. This delivery queue handles booking messages; it does not claim to have configured Auth SMTP.
