// Operator-sent nudges for people who stopped part-way through JovaBook signup.
// The recipient always comes from the guarded database function, never from the browser.
const SITE = 'https://book.jovamedia.com';
const SUPPORT = 'support.jovamedia@gmail.com';
const NAVY = '#153a5b', GOLD = '#f1d302', INK = '#0e2b46', MUTED = '#4b657c', MIST = '#f5f8fb';

export const OUTREACH_TEMPLATES = {
  verify_email: {
    label: 'Verify your email',
    hint: 'For people who have not confirmed their email yet',
    subject: 'Confirm your email to finish joining JovaBook',
    preheader: 'One click and your JovaBook account is ready.',
    heading: 'You are nearly in.',
    paragraphs: name => [
      `${greeting(name)} you started creating a JovaBook account, but we have not seen your email confirmed yet.`,
      'Look for an email from JovaBook with your confirmation link. It can land in spam or promotions, so check there too.',
      'Cannot find it? Sign up again with the same email and we will send a fresh link. It takes about a minute.',
    ],
    button: 'Continue signing up',
    link: SITE + '/?portal=owner#signup',
    closing: 'Once you are confirmed, you can set up your booking page and start taking bookings.',
  },
  come_back: {
    label: 'Come back and log in',
    hint: 'For people who have not logged in for a while',
    subject: 'Your JovaBook diary is waiting for you',
    preheader: 'Your account is still here. Pick up where you left off.',
    heading: 'Your diary is still here.',
    paragraphs: name => [
      `${greeting(name)} it has been a few days since you last logged in to JovaBook, so we wanted to check in.`,
      'Everything you set up is exactly as you left it. Adding your services, setting your opening hours and sharing your booking link only takes a few minutes.',
      'If something put you off or did not make sense, just reply to this email and a real person will help.',
    ],
    button: 'Log in to JovaBook',
    link: SITE + '/login',
    closing: 'We would love to see you get your first booking.',
  },
  finish_setup: {
    label: 'Finish setting up your business',
    hint: 'For people who verified but have not set up their business',
    subject: 'You are one step from your first booking',
    preheader: 'Add your business name and your booking page is ready to share.',
    heading: 'One step left.',
    paragraphs: name => [
      `${greeting(name)} thanks for confirming your email. Your JovaBook account is ready, but your business is not set up yet.`,
      'Add your business name and choose your booking address, and clients can start booking you online. Most people finish in about two minutes.',
      'Stuck on anything? Reply to this email and we will walk you through it.',
    ],
    button: 'Finish setting up',
    link: SITE + '/login',
    closing: 'Your clients can book you any time of day once you are live.',
  },
};

function greeting(name) { return name ? `Hi ${name},` : 'Hi there,'; }
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeName = v => String(v || '').replace(/[\r\n\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, 40);

export function outreachEmail(template, { firstName = '' } = {}) {
  const t = OUTREACH_TEMPLATES[template];
  if (!t) throw Error('Unknown email template.');
  const name = safeName(firstName), paras = t.paragraphs(name);
  const text = [t.heading, '', ...paras, '', `${t.button}: ${t.link}`, '', t.closing, '', 'The JovaBook team', '',
    `Questions? Reply to this email or write to ${SUPPORT}.`,
    'You are receiving this because you started signing up for JovaBook. Reply if you would rather we did not email you.'].join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject)}</title></head>
<body style="margin:0;padding:0;background:${MIST};font-family:Arial,Helvetica,sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(t.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${MIST}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
<tr><td style="background:${NAVY};border-radius:18px 18px 0 0;padding:26px 36px">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:3px;color:#ffffff;font-weight:bold">JOVA</span><span style="font-size:13px;letter-spacing:2px;color:#a9c2d8;padding-left:10px">BOOK</span></td></tr>
<tr><td style="background:${GOLD};height:5px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="background:#ffffff;padding:40px 36px 12px">
<h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;color:${INK};font-weight:bold">${esc(t.heading)}</h1>
${paras.map(p => `<p style="margin:0 0 16px;font-size:16.5px;line-height:1.6;color:${INK}">${esc(p)}</p>`).join('')}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 10px"><tr><td style="background:${GOLD};border-radius:999px;border-bottom:3px solid #b9a300">
<a href="${esc(t.link)}" style="display:inline-block;padding:15px 34px;font-size:16.5px;font-weight:bold;color:${INK};text-decoration:none">${esc(t.button)}</a></td></tr></table>
<p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">${esc(t.closing)}</p>
<p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:${INK}">The JovaBook team</p></td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 18px 18px;padding:26px 36px 34px"><div style="border-top:1px solid #e1eaf2;padding-top:18px;font-size:12.5px;line-height:1.6;color:#6a8398">Questions? Reply to this email or write to ${SUPPORT}.<br>You are receiving this because you started signing up for JovaBook. Reply if you would rather we did not email you.</div></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: t.subject, text, html };
}

const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createOperatorOutreachHandler({ env = process.env, send = fetch } = {}) {
  return async request => {
    if (request.method !== 'POST') return reply(405, { ok: false });
    const origin = request.headers.get('origin');
    if (origin && !['https://book.jovamedia.com', 'https://www.jovamedia.com', 'https://jovamedia.com'].includes(origin)) return reply(403, { ok: false });
    const auth = request.headers.get('authorization');
    if (!/^Bearer [A-Za-z0-9._~-]{1,4096}$/.test(auth || '')) return reply(401, { ok: false });
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 1000) throw Error();
      body = JSON.parse(raw);
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !['user_id', 'template'].includes(k))) throw Error();
    } catch { return reply(400, { ok: false, message: 'Choose a person and an email template.' }); }
    if (!UUID.test(body.user_id || '') || !Object.hasOwn(OUTREACH_TEMPLATES, body.template)) return reply(400, { ok: false, message: 'Choose a person and an email template.' });
    const base = env.JOVABOOK_SUPABASE_URL, key = env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY;
    if (!base || !key || !env.RESEND_API_KEY) return reply(503, { ok: false, message: 'Email sending is not set up yet.' });
    const rpc = async (name, args) => {
      const url = new URL('/rest/v1/rpc/' + name, base);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error('Bad configuration');
      const r = await send(url.href, { method: 'POST', headers: { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(8000) });
      return { ok: r.ok, status: r.status, data: await r.json().catch(() => null) };
    };
    try {
      const who = await rpc('portal_identity', { p_claim: null });
      if (!who.ok) return reply([401, 403].includes(who.status) ? who.status : 503, { ok: false });
      if (who.data?.ok !== true || who.data.role !== 'operator') return reply(403, { ok: false });
      const prepared = await rpc('operator_outreach_prepare', { p_user: body.user_id, p_template: body.template });
      if (!prepared.ok) return reply([401, 403].includes(prepared.status) ? prepared.status : 503, { ok: false, message: 'Could not check this account. Please try again.' });
      if (prepared.data?.ok !== true) return reply(409, { ok: false, message: String(prepared.data?.message || 'This email cannot be sent.').slice(0, 200) });
      const { id, email, first_name: firstName } = prepared.data;
      const content = outreachEmail(body.template, { firstName });
      let sent = false, providerId = null;
      try {
        const r = await send('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'operator-outreach-' + id },
          body: JSON.stringify({ from: env.JOVABOOK_OUTREACH_FROM || 'JovaBook <bookings@jovamedia.com>', to: [email], reply_to: SUPPORT, ...content, tags: [{ name: 'app', value: 'jovabook' }, { name: 'kind', value: 'operator_outreach_' + body.template }] }),
          signal: AbortSignal.timeout(12000),
        });
        const data = await r.json().catch(() => ({}));
        sent = r.ok; providerId = data?.id || null;
      } catch { sent = false; }
      await rpc('operator_outreach_finish', { p_id: id, p_status: sent ? 'sent' : 'failed', p_provider: providerId }).catch(() => null);
      if (!sent) return reply(502, { ok: false, message: 'The email provider did not accept the message. Nothing was sent. Try again in a minute.' });
      return reply(200, { ok: true, template: body.template, sent_at: new Date().toISOString() });
    } catch {
      return reply(503, { ok: false, message: 'Email could not be sent. Please try again.' });
    }
  };
}
