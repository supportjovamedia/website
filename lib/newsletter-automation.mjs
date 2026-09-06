import { createHash } from 'node:crypto';

// Resend events do not support idempotency keys. Claim once in shared storage
// before dispatch, and retain uncertain attempts for manual reconciliation.
export async function startNewsletterAutomation({ env, send, email, contactId }) {
  if (env.NEWSLETTER_AUTOMATION_ENABLED !== 'true') return;
  const url = new URL(env.UPSTASH_REDIS_REST_URL);
  if (url.protocol !== 'https:' || !env.UPSTASH_REDIS_REST_TOKEN) throw Error('Missing automation storage');
  const command = async (...args) => {
    const response = await send(url.href, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(12000),
    });
    const body = await response.json();
    if (!response.ok || body.error) throw Error('Automation storage unavailable');
    return body.result;
  };
  const hash = createHash('sha256').update(`${env.RESEND_NEWSLETTER_SEGMENT_ID}:${email.toLowerCase()}`).digest('hex');
  const record = `newsletter:welcome-v1:${hash}`;
  const claimed = await command('SET', record, 'pending', 'NX');
  if (claimed !== 'OK') {
    if (await command('GET', record) === 'sent') return;
    throw Error('Automation attempt needs reconciliation');
  }
  // No automatic retries: a timeout can mean Resend accepted the event.
  const response = await send('https://api.resend.com/events/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'newsletter.confirmed', contact_id: contactId }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    // Explicit client rejection is safe to retry after configuration is fixed.
    if (response.status >= 400 && response.status < 500 && response.status !== 408) await command('DEL', record);
    throw Error('Automation event rejected');
  }
  await command('SET', record, 'sent');
}
