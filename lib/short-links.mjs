import { createHash } from 'node:crypto';

// Short links for outreach. A click is recorded server-side (no cookies, no raw IP),
// then the visitor is forwarded to the destination with campaign labels attached.
// Storage is the same free Upstash database the site already uses.

const SITE = 'https://www.jovamedia.com';
const CODE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const LABEL = /^[a-zA-Z0-9_.-]{1,100}$/;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slackbot|telegram|discord|skypeuri|embedly|curl|wget|python-requests|headless/i;
const PREFIX = 'shortlink:v1';

export const isCode = value => typeof value === 'string' && CODE.test(value);
export const isBot = userAgent => !userAgent || BOT.test(userAgent);

export function cleanLink(input) {
  const code = String(input?.code || '').toLowerCase();
  if (!isCode(code)) throw Error('Link code must be 2-40 lowercase letters, numbers or hyphens.');
  const labels = {};
  for (const key of ['platform', 'medium', 'campaign', 'content']) {
    const value = String(input?.[key] || '').toLowerCase();
    if (!LABEL.test(value)) throw Error(`${key} must be 1-100 letters, numbers, dots, underscores or hyphens.`);
    labels[key] = value;
  }
  const destination = String(input?.destination || '/jovabook');
  // Same-site paths only: no protocol, no protocol-relative URLs, no query or fragment.
  if (!/^\/[a-z0-9/_-]*$/i.test(destination) || destination.includes('//')) throw Error('Destination must be a page path on this site.');
  return { code, ...labels, destination };
}

export function destinationUrl(link) {
  const url = new URL(link.destination, SITE);
  url.searchParams.set('utm_source', link.platform);
  url.searchParams.set('utm_medium', link.medium);
  url.searchParams.set('utm_campaign', link.campaign);
  url.searchParams.set('utm_content', link.content);
  return url.toString();
}

export function visitorFingerprint({ salt, ip, userAgent, day, code }) {
  if (!salt) return null;
  // One-way and per day: it counts distinct visitors without storing an IP address.
  return createHash('sha256').update(`${salt}:${day}:${code}:${ip || ''}:${userAgent || ''}`).digest('hex').slice(0, 32);
}

export function createStore({ env = process.env, send = fetch } = {}) {
  const managed = Boolean(env.JOVA_NEWSLETTER_KV_REST_API_URL || env.JOVA_NEWSLETTER_KV_REST_API_TOKEN);
  const storageUrl = managed ? env.JOVA_NEWSLETTER_KV_REST_API_URL : env.UPSTASH_REDIS_REST_URL;
  const storageToken = managed ? env.JOVA_NEWSLETTER_KV_REST_API_TOKEN : env.UPSTASH_REDIS_REST_TOKEN;
  const command = async (...args) => {
    const url = new URL(storageUrl);
    if (url.protocol !== 'https:' || !storageToken) throw Error('Missing link storage');
    const response = await send(url.href, {
      method: 'POST',
      headers: { Authorization: `Bearer ${storageToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
    });
    const body = await response.json();
    if (!response.ok || body.error) throw Error('Link storage unavailable');
    return body.result;
  };
  return {
    async get(code) {
      const raw = await command('HGET', `${PREFIX}:links`, code);
      return raw ? JSON.parse(raw) : null;
    },
    async create(link) {
      const stored = JSON.stringify({ ...link, created: new Date().toISOString() });
      // HSETNX: an existing code is never overwritten, so a shared link keeps its meaning.
      const added = await command('HSETNX', `${PREFIX}:links`, link.code, stored);
      return added === 1;
    },
    async list() {
      const all = (await command('HGETALL', `${PREFIX}:links`)) || [];
      const links = [];
      for (let i = 0; i < all.length; i += 2) links.push(JSON.parse(all[i + 1]));
      return Promise.all(links.map(async link => {
        const [clicks, bots, unique, last] = await Promise.all([
          command('GET', `${PREFIX}:clicks:${link.code}`), command('GET', `${PREFIX}:bots:${link.code}`),
          command('PFCOUNT', `${PREFIX}:unique:${link.code}`), command('GET', `${PREFIX}:last:${link.code}`),
        ]);
        return { ...link, clicks: Number(clicks || 0), bots: Number(bots || 0), unique: Number(unique || 0), last: last || null };
      }));
    },
    async record({ code, bot, fingerprint }) {
      if (bot) return command('INCR', `${PREFIX}:bots:${code}`);
      await command('INCR', `${PREFIX}:clicks:${code}`);
      await command('SET', `${PREFIX}:last:${code}`, new Date().toISOString());
      if (fingerprint) await command('PFADD', `${PREFIX}:unique:${code}`, fingerprint);
    },
  };
}

function reply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export function createRedirectHandler({ env = process.env, send = fetch, store = createStore({ env, send }), now = () => new Date() } = {}) {
  return async (request, code) => {
    const fallback = () => new Response(null, { status: 302, headers: { Location: `${SITE}/jovabook`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    if (!isCode(code)) return new Response('Not found', { status: 404 });
    let link;
    try { link = await store.get(code); } catch { return fallback(); }
    if (!link) return new Response('Not found', { status: 404 });
    const userAgent = request.headers.get('user-agent') || '';
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const bot = isBot(userAgent);
    const fingerprint = bot ? null : visitorFingerprint({ salt: env.SHORT_LINK_SALT, ip, userAgent, day: now().toISOString().slice(0, 10), code });
    // Counting must never stop a visitor reaching the page.
    try { await store.record({ code, bot, fingerprint }); } catch { /* storage unavailable */ }
    return new Response(null, { status: 302, headers: { Location: destinationUrl(link), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  };
}

export function createOperatorLinksHandler({ env = process.env, send = fetch, store = createStore({ env, send }) } = {}) {
  return async request => {
    if (request.method !== 'POST') return reply(405, { ok: false });
    const origin = request.headers.get('origin');
    if (origin && !['https://book.jovamedia.com', 'https://www.jovamedia.com'].includes(origin)) return reply(403, { ok: false });
    const auth = request.headers.get('authorization');
    if (!/^Bearer [^\s]+$/.test(auth || '')) return reply(401, { ok: false });
    try {
      const url = new URL('/rest/v1/rpc/portal_identity', env.JOVABOOK_SUPABASE_URL);
      if (url.protocol !== 'https:' || !env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY) throw Error('Missing configuration');
      // The database verifies who is asking. Only the operator role may read or create links.
      const identity = await send(url.href, {
        method: 'POST',
        headers: { apikey: env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY, Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_claim: null }), signal: AbortSignal.timeout(10000),
      });
      if (!identity.ok) return reply([401, 403].includes(identity.status) ? identity.status : 503, { ok: false });
      const who = await identity.json();
      if (who?.ok !== true || who.role !== 'operator') return reply(403, { ok: false });
      const input = await request.json().catch(() => ({}));
      if (input.action === 'create') {
        let link;
        try { link = cleanLink(input.link); } catch (error) { return reply(400, { ok: false, message: error.message }); }
        if (!(await store.create(link))) return reply(409, { ok: false, message: 'That link code already exists.' });
      }
      const links = (await store.list()).sort((a, b) => b.clicks - a.clicks || a.code.localeCompare(b.code));
      return reply(200, { ok: true, links, base: `${SITE}/go/` });
    } catch {
      return reply(503, { ok: false, message: 'Links could not be loaded. Please try again.' });
    }
  };
}
