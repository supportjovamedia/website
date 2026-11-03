// Daily estimated unique link opens. Raw addresses and browser strings never
// leave the redirect handler. Daily, per-link hashes cannot link browsing journeys.
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
const SITE = 'https://www.jovamedia.com';
const CODE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const LABEL = /^[a-z0-9_.-]{1,100}$/;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slackbot|telegram|discord|skypeuri|embedly|curl|wget|python-requests|headless/i;
const FIELDS = ['code', 'platform', 'medium', 'campaign', 'content', 'destination'];
const DESTINATIONS = new Set(['/', '/jovabook', '/websites', '/products', '/pricing', '/services', '/contact', '/get-a-quote']);
const REGISTRY = 'shortlink:v1:links';
// A new aggregate-only namespace does not read or reuse older visitor metrics.
const TOTALS = 'shortlink:v2:totals:';
const DAILY = 'shortlink:v3:daily:';
export const LINK_STATS_COOKIE='jova-link-statistics';
export function linkDay(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function linkStatisticsAllowed(headers){return !/(?:^|;\s*)jova-link-statistics=off(?:;|$)/.test(headers.get('cookie')||'')&&headers.get('sec-gpc')!=='1'&&headers.get('dnt')!=='1';}
export function linkReferrer(value){if(!value)return 'direct';try{const h=new URL(value).hostname.toLowerCase();if(h==='instagram.com'||h.endsWith('.instagram.com'))return 'instagram';if(/(^|\.)nextdoor\.(com|co\.uk)$/.test(h))return 'nextdoor';if(h==='wa.me'||h==='whatsapp.com'||h.endsWith('.whatsapp.com'))return 'whatsapp';}catch{}return 'other';}
function browserGroup(ua){const browser=/Edg\//i.test(ua)?'edge':/OPR\//i.test(ua)?'opera':/Firefox\//i.test(ua)?'firefox':/Chrome\//i.test(ua)?'chrome':/Safari\//i.test(ua)?'safari':'other';const os=/Android/i.test(ua)?'android':/iPhone|iPad/i.test(ua)?'ios':/Windows/i.test(ua)?'windows':/Macintosh|Mac OS X/i.test(ua)?'mac':/Linux/i.test(ua)?'linux':'other';return browser+':'+os;}
export function dailyLinkIdentity(request,code,env,date=new Date()){
 try{
 if(env.VERCEL!=='1'||!linkStatisticsAllowed(request.headers))return null;
 const ua=request.headers.get('user-agent')||'';if(isBot(ua)||/prefetch|prerender/i.test(request.headers.get('sec-purpose')||request.headers.get('purpose')||''))return null;
 const raw=request.headers.get('x-vercel-forwarded-for')||'';if(!isIP(raw))return null;
 const secret=env.JOVA_NEWSLETTER_KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;if(!secret)return null;
 let address=raw.toLowerCase();if(isIP(raw)===6){address=new URL('http://['+raw+']/').hostname.slice(1,-1);if(address.startsWith('::ffff:')&&address.slice(7).includes('.'))address=address.slice(7);}
 const day=linkDay(date);return {day,digest:createHmac('sha256',secret).update(['jova-daily-link-v1',day,code,address,browserGroup(ua)].join('\0')).digest('hex')};
 }catch{return null;}
}
const MAX_CUSTOM = 50;
export const LOOKUP_TIMEOUT_MS = 250;
const STORAGE_TIMEOUT_MS = 1000, COUNT_TIMEOUT_MS = 750;
export const TRACKING_PERIOD = Object.freeze({ kind: 'lifetime', label: 'Since aggregate tracking began', retention: 'Aggregate counts are retained while the link exists.' });
export const BUILTIN_LINKS = Object.freeze([
  { code: 'instagram', platform: 'instagram', medium: 'social', content: 'direct_message' },
  { code: 'nextdoor', platform: 'nextdoor', medium: 'social', content: 'introduction' },
  { code: 'whatsapp', platform: 'whatsapp', medium: 'message', content: 'introduction' },
].map(link => Object.freeze({ ...link, campaign: 'jovabook_launch', destination: '/jovabook', builtin: true, created: null })));
const builtin = code => BUILTIN_LINKS.find(link => link.code === code);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isCode = value => typeof value === 'string' && CODE.test(value);
export const isBot = userAgent => !userAgent || BOT.test(userAgent);

function bounded(operation, milliseconds) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Link operation timed out.')), milliseconds);
    Promise.resolve().then(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function cleanLink(input) {
  if (!object(input) || Object.keys(input).some(key => !FIELDS.includes(key))) throw Error('Invalid link fields.');
  const code = typeof input.code === 'string' ? input.code.toLowerCase() : '';
  if (!isCode(code)) throw Error('Link code must be 2-40 lowercase letters, numbers or hyphens.');
  const labels = {};
  for (const key of ['platform', 'medium', 'campaign', 'content']) {
    const value = typeof input[key] === 'string' ? input[key].toLowerCase() : '';
    if (!LABEL.test(value)) throw Error(`${key} must be 1-100 letters, numbers, dots, underscores or hyphens.`);
    labels[key] = value;
  }
  const destination = input.destination === undefined ? '/jovabook' : input.destination;
  if (!DESTINATIONS.has(destination)) throw Error('Choose a public marketing page: ' + [...DESTINATIONS].join(', ') + '.');
  return { code, ...labels, destination };
}
function metadata(value, code) {
  if (!object(value)) throw Error('Invalid stored link.');
  const link = cleanLink(Object.fromEntries(FIELDS.filter(key => value[key] !== undefined).map(key => [key, value[key]])));
  if (code !== undefined && link.code !== code) throw Error('Stored link code changed.');
  return { ...link, builtin: false, created: typeof value.created === 'string' && value.created.length <= 40 && Number.isFinite(Date.parse(value.created)) ? value.created : null };
}
export function destinationUrl(value) {
  const link = metadata(value), url = new URL(link.destination, SITE);
  for (const [label, key] of [['source', 'platform'], ['medium', 'medium'], ['campaign', 'campaign'], ['content', 'content']]) url.searchParams.set('utm_' + label, link[key]);
  return url.toString();
}
function mergeLinks(custom = []) {
  const links = new Map(BUILTIN_LINKS.map(link => [link.code, link]));
  for (const value of custom.slice(0, MAX_CUSTOM)) {
    try { const link = metadata(value); if (!links.has(link.code)) links.set(link.code, link); } catch { /* Invalid legacy destinations never become redirects. */ }
  }
  return [...links.values()];
}
function counter(value) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw Error('Invalid aggregate count.');
  return parsed;
}
const unknownStats = link => ({ ...link, clicks: null, bots: null, unique_today:null, unique_available:false, last: null, stats_available: false });
const unavailable = () => ({ available: false, links: BUILTIN_LINKS.map(unknownStats), period: TRACKING_PERIOD });

export function createStore({ env = process.env, send = fetch, now = () => new Date() } = {}) {
  const managed = Boolean(env.JOVA_NEWSLETTER_KV_REST_API_URL || env.JOVA_NEWSLETTER_KV_REST_API_TOKEN);
  const storageUrl = managed ? env.JOVA_NEWSLETTER_KV_REST_API_URL : env.UPSTASH_REDIS_REST_URL;
  const storageToken = managed ? env.JOVA_NEWSLETTER_KV_REST_API_TOKEN : env.UPSTASH_REDIS_REST_TOKEN;
  async function redis(commands, { pipeline = false, timeout = STORAGE_TIMEOUT_MS } = {}) {
    const url = new URL(storageUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !storageToken || typeof storageToken !== 'string' || storageToken.length > 4096) throw Error('Missing link storage.');
    if (pipeline) url.pathname = '/pipeline';
    return bounded(async () => {
      const response = await send(url.href, { method: 'POST', headers: { Authorization: `Bearer ${storageToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands), cache: 'no-store', signal: AbortSignal.timeout(timeout) });
      const raw = await response.text();
      if (raw.length > 262144) throw Error('Link storage response is too large.');
      const body = JSON.parse(raw);
      if (!response.ok || (pipeline ? !Array.isArray(body) || body.length !== commands.length || body.some(item => !object(item) || item.error) : !object(body) || body.error)) throw Error('Link storage unavailable.');
      return pipeline ? body.map(item => item.result) : body.result;
    }, timeout);
  }
  return {
    async get(code) {
      if (!isCode(code)) return null;
      if (builtin(code)) return builtin(code);
      const raw = await redis(['HGET', REGISTRY, code], { timeout: LOOKUP_TIMEOUT_MS });
      return raw ? metadata(JSON.parse(raw), code) : null;
    },
    async create(value) {
      const link = cleanLink(value);
      if (builtin(link.code)) return false;
      const stored = JSON.stringify({ ...link, created: now().toISOString() });
      // Capacity and immutable-code insertion are atomic, including concurrent requests.
      const script = "if redis.call('HEXISTS',KEYS[1],ARGV[1])==1 then return 0 end if redis.call('HLEN',KEYS[1])>=tonumber(ARGV[3]) then return -1 end return redis.call('HSETNX',KEYS[1],ARGV[1],ARGV[2])";
      const added = await redis(['EVAL', script, 1, REGISTRY, link.code, stored, MAX_CUSTOM]);
      if (added === -1) throw Object.assign(Error('The custom link limit has been reached.'), { status: 409 });
      if (added !== 0 && added !== 1) throw Error('Unverified link creation.');
      return added === 1;
    },
    async list() {
      try {
        const all = await redis(['HGETALL', REGISTRY]);
        if (!Array.isArray(all) || all.length % 2 || all.length > (MAX_CUSTOM + BUILTIN_LINKS.length) * 2) throw Error('Link registry needs review.');
        const custom = [];
        for (let i = 0; i < all.length; i += 2) {
          try { if (!builtin(all[i])) custom.push(metadata(JSON.parse(all[i + 1]), all[i])); } catch { /* Skip unsafe legacy metadata. */ }
        }
        const links = mergeLinks(custom), totals = await redis(links.map(link => ['HGETALL', TOTALS + link.code]), { pipeline: true });
        let uniques;try{uniques=await redis(links.map(link=>['SCARD',DAILY+linkDay(now())+':'+link.code]),{pipeline:true});}catch{uniques=null;}
        return { available: true, period: TRACKING_PERIOD, links: links.map((link, index) => {
          const fields = totals[index];
          if (!Array.isArray(fields) || fields.length % 2 || fields.length > 8) throw Error('Invalid aggregate fields.');
          const data = Object.fromEntries(Array.from({ length: fields.length / 2 }, (_, i) => [fields[i * 2], fields[i * 2 + 1]]));
          let uniqueCount=null;try{if(uniques&&uniques[index]!==null)uniqueCount=counter(uniques[index]);}catch{}
          return { ...link, clicks: counter(data.clicks), bots: counter(data.bots), unique_today:uniqueCount,unique_available:uniqueCount!==null,unique_day:linkDay(now()), last: typeof data.last === 'string' && data.last.length <= 40 && Number.isFinite(Date.parse(data.last)) ? data.last : null, stats_available: true };
        }) };
      } catch { return unavailable(); }
    },
    async record({ code, bot, unique, referrer, at = now().toISOString() }) {
      if (!isCode(code) || typeof bot !== 'boolean' || typeof at !== 'string' || !Number.isFinite(Date.parse(at)) || at.length > 40) throw Error('Invalid click event.');
      // One bounded background request. Daily hashes never include a saved IP.
      const key = TOTALS + code;
      const commands = [['HINCRBY', key, bot ? 'bots' : 'clicks', 1], ...(!bot ? [['HSET', key, 'last', at]] : []), ['HSETNX', key, 'started', at]];
      if(!bot&&unique&&unique.day===linkDay(new Date(at))&&/^[a-f0-9]{64}$/.test(unique.digest)){const daily=DAILY+unique.day+':'+code;const script="local n=redis.call('SADD',KEYS[1],ARGV[1]);redis.call('EXPIRE',KEYS[1],172800);return n";commands.push(['EVAL',script,1,daily,unique.digest]);}
      if(!bot&&['direct','instagram','nextdoor','whatsapp','other'].includes(referrer))commands.push(['HINCRBY','shortlink:v3:referrers:'+code,referrer,1]);
      await redis(commands, { pipeline: true, timeout: COUNT_TIMEOUT_MS });
    },
  };
}
function reply(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
async function input(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('Invalid request.');
  const decoder = new TextDecoder(); let raw = '', bytes = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 8192) { await reader.cancel(); throw Error('Request is too large.'); } raw += decoder.decode(value, { stream: true }); }
    raw += decoder.decode();
    const body = JSON.parse(raw);
    if (!object(body) || !['list', 'create'].includes(body.action) || Object.keys(body).some(key => !(body.action === 'create' ? ['action', 'link'] : ['action']).includes(key)) || body.action === 'create' && !object(body.link)) throw Error('Invalid request.');
    return body;
  } catch { throw Error('Use a valid list or create request.'); } finally { reader.releaseLock(); }
}
function statement(result, extra = []) {
  if (result?.available !== true || !Array.isArray(result.links)) return { ...unavailable(), links: mergeLinks(extra).map(unknownStats) };
  const supplied = new Map(result.links.filter(object).map(link => [link.code, link]));
  return { available: true, period: TRACKING_PERIOD, links: mergeLinks([...result.links, ...extra]).map(link => {
    const data = supplied.get(link.code);
    if (!data || data.stats_available !== true) return unknownStats(link);
    try { return { ...link, clicks: counter(data.clicks), bots: counter(data.bots),unique_today:data.unique_available===true?counter(data.unique_today):null,unique_available:data.unique_available===true,unique_day:data.unique_day, last: typeof data.last === 'string' && data.last.length <= 40 && Number.isFinite(Date.parse(data.last)) ? data.last : null, stats_available: true }; } catch { return unknownStats(link); }
  }) };
}
export function createRedirectHandler({ env = process.env, send = fetch, store = createStore({ env, send }), now = () => new Date(), schedule = () => {} } = {}) {
  return async (request, code) => {
    const redirect = location => new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    const fallback = () => redirect(SITE + '/jovabook');
    if (!isCode(code)) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    let link = builtin(code);
    if (!link) { try { link = metadata(await bounded(() => store.get(code), LOOKUP_TIMEOUT_MS), code); } catch { return fallback(); } }
    if (!link) return fallback();
    let destination;
    try { destination = destinationUrl(link); } catch { return fallback(); }
    if (request.method === 'GET' && linkStatisticsAllowed(request.headers)) {
      const event = { code, bot: isBot(request.headers.get('user-agent') || ''), at: now().toISOString() };
      event.referrer=linkReferrer(request.headers.get('referer'));
      const unique=dailyLinkIdentity(request,code,env,new Date(event.at));if(unique)event.unique=unique;
      // The route injects Next.js after(). It runs this only after the redirect
      // response finishes. Without a host scheduler, no background task is started.
      try { schedule(async () => { try { await bounded(() => store.record(event), COUNT_TIMEOUT_MS); } catch { /* Counting cannot affect navigation. */ } }); } catch { /* Scheduler unavailable. */ }
    }
    return redirect(destination);
  };
}
export function createOperatorLinksHandler({ env = process.env, send = fetch, store = createStore({ env, send }) } = {}) {
  return async request => {
    if (request.method !== 'POST') return reply(405, { ok: false });
    const origin = request.headers.get('origin');
    if (origin && !['https://book.jovamedia.com', SITE].includes(origin)) return reply(403, { ok: false });
    const auth = request.headers.get('authorization');
    if (!/^Bearer [A-Za-z0-9._~-]{1,4096}$/.test(auth || '')) return reply(401, { ok: false });
    let body;
    try { body = await bounded(() => input(request), 1000); } catch { return reply(400, { ok: false, message: 'Use a valid list or create request up to 8 KB.' }); }
    try {
      const url = new URL('/rest/v1/rpc/portal_identity', env.JOVABOOK_SUPABASE_URL);
      if (url.protocol !== 'https:' || url.username || url.password || !env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY) throw Error('Missing configuration.');
      const identity = await bounded(() => send(url.href, { method: 'POST', headers: { apikey: env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY, Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_claim: null }), cache: 'no-store', signal: AbortSignal.timeout(2000) }), 2000);
      if (!identity.ok) return reply([401, 403].includes(identity.status) ? identity.status : 503, { ok: false });
      const who = await bounded(() => identity.json(), 1000);
      if (who?.ok !== true || who.role !== 'operator') return reply(403, { ok: false });
      let created;
      if (body.action === 'create') {
        try { created = cleanLink(body.link); } catch (error) { return reply(400, { ok: false, message: error.message }); }
        if (builtin(created.code) || !(await bounded(() => store.create(created), STORAGE_TIMEOUT_MS))) return reply(409, { ok: false, message: 'That link code already exists or is a protected campaign.' });
      }
      let result;
      try { result = await bounded(() => store.list(), STORAGE_TIMEOUT_MS * 2 + 100); } catch { result = unavailable(); }
      const data = statement(result, created ? [created] : []);
      data.links.sort((a, b) => a.code.localeCompare(b.code));
      return reply(200, { ok: true, ...data, base: SITE + '/go/' });
    } catch (error) {
      return reply(error?.status === 409 ? 409 : 503, { ok: false, available: false, message: error?.status === 409 ? 'The custom link limit has been reached.' : 'Links could not be saved or access could not be verified. Please try again.' });
    }
  };
}
