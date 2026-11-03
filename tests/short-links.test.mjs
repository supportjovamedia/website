import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLink, destinationUrl, isBot, isCode, visitorFingerprint, createRedirectHandler, createOperatorLinksHandler } from '../lib/short-links.mjs';

const link = { code: 'nd-barber-01', platform: 'nextdoor', medium: 'dm', campaign: 'jovabook_outreach', content: 'barber', destination: '/jovabook' };

function memoryStore(initial = {}) {
  const links = { ...initial }, clicks = {}, bots = {}, last = {}, unique = {};
  return {
    links, clicks, bots, unique,
    async get(code) { return links[code] || null; },
    async create(value) { if (links[value.code]) return false; links[value.code] = value; return true; },
    async list() { return Object.values(links).map(l => ({ ...l, clicks: clicks[l.code] || 0, bots: bots[l.code] || 0, unique: unique[l.code]?.size || 0, last: last[l.code] || null })); },
    async record({ code, bot, fingerprint }) {
      if (bot) { bots[code] = (bots[code] || 0) + 1; return; }
      clicks[code] = (clicks[code] || 0) + 1; last[code] = 'now';
      if (fingerprint) (unique[code] ||= new Set()).add(fingerprint);
    },
  };
}

const request = (ua = 'Mozilla/5.0 (iPhone) Safari', ip = '1.2.3.4') => new Request('https://www.jovamedia.com/go/x', { headers: { 'user-agent': ua, 'x-forwarded-for': ip } });

test('codes and labels are validated and normalised', () => {
  assert.equal(isCode('nd-barber-01'), true);
  for (const bad of ['', 'A', 'x', '-bad', 'has space', 'a/b', '../x', 'x'.repeat(41), null]) assert.equal(isCode(bad), false);
  assert.deepEqual(cleanLink({ ...link, code: 'ND-Barber-01', platform: 'NextDoor' }).platform, 'nextdoor');
  assert.throws(() => cleanLink({ ...link, platform: 'next door' }));
  assert.throws(() => cleanLink({ ...link, content: '' }));
});

test('destinations are same-site paths only', () => {
  for (const bad of ['https://evil.example/', '//evil.example', '/jovabook?x=1', '/a//b', 'jovabook', '/a#b']) assert.throws(() => cleanLink({ ...link, destination: bad }), bad);
  assert.equal(cleanLink({ ...link, destination: '/jovabook' }).destination, '/jovabook');
});

test('destination carries all four campaign labels on the real site', () => {
  const url = new URL(destinationUrl(link));
  assert.equal(url.origin + url.pathname, 'https://www.jovamedia.com/jovabook');
  assert.deepEqual(Object.fromEntries(url.searchParams), { utm_source: 'nextdoor', utm_medium: 'dm', utm_campaign: 'jovabook_outreach', utm_content: 'barber' });
});

test('link-preview crawlers and empty agents are treated as bots', () => {
  for (const ua of ['WhatsApp/2.23', 'facebookexternalhit/1.1', 'Slackbot-LinkExpanding', 'Twitterbot', '']) assert.equal(isBot(ua), true, ua);
  assert.equal(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit Mobile Safari Instagram 300'), false);
});

test('fingerprint is salted, per day and never contains the address', () => {
  const base = { salt: 's', ip: '203.0.113.9', userAgent: 'UA', day: '2026-11-03', code: 'x' };
  const a = visitorFingerprint(base);
  assert.equal(a.includes('203'), false);
  assert.notEqual(a, visitorFingerprint({ ...base, day: '2026-11-04' }));
  assert.notEqual(a, visitorFingerprint({ ...base, ip: '203.0.113.10' }));
  assert.equal(visitorFingerprint({ ...base, salt: '' }), null);
});

test('redirect counts a person once per day, separates bots, and always forwards', async () => {
  const store = memoryStore({ [link.code]: link });
  const go = createRedirectHandler({ env: { SHORT_LINK_SALT: 'salt' }, store, now: () => new Date('2026-11-03T12:00:00Z') });
  const first = await go(request(), link.code);
  assert.equal(first.status, 302);
  assert.match(first.headers.get('location'), /utm_source=nextdoor/);
  await go(request(), link.code);
  await go(request('WhatsApp/2.23'), link.code);
  assert.equal(store.clicks[link.code], 2);
  assert.equal(store.unique[link.code].size, 1);
  assert.equal(store.bots[link.code], 1);
  assert.equal((await go(request(), 'unknown-code')).status, 404);
  assert.equal((await go(request(), '../etc')).status, 404);
});

test('a storage outage never blocks the visitor', async () => {
  const broken = { async get() { throw Error('down'); } };
  const res = await createRedirectHandler({ env: {}, store: broken })(request(), link.code);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://www.jovamedia.com/jovabook');
  const recordFails = { async get() { return link; }, async record() { throw Error('down'); } };
  assert.match((await createRedirectHandler({ env: {}, store: recordFails })(request(), link.code)).headers.get('location'), /utm_content=barber/);
});

const env = { JOVABOOK_SUPABASE_URL: 'https://db.example.test', JOVABOOK_SUPABASE_PUBLISHABLE_KEY: 'pk' };
const operatorCall = (body, headers = {}) => new Request('https://www.jovamedia.com/api/jovabook/operator/links', { method: 'POST', headers: { authorization: 'Bearer token', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const identity = role => async () => new Response(JSON.stringify({ ok: true, role }), { status: 200 });

test('only a verified operator can list or create links', async () => {
  const store = memoryStore();
  const handler = (role, status = 200) => createOperatorLinksHandler({ env, store, send: async () => status === 200 ? identity(role)() : new Response('{}', { status }) });
  assert.equal((await handler('operator')(new Request('https://x.test', { method: 'GET' }))).status, 405);
  assert.equal((await handler('operator')(operatorCall({}, { authorization: '' }))).status, 401);
  assert.equal((await handler('operator')(operatorCall({}, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler('owner')(operatorCall({ action: 'create', link }))).status, 403);
  assert.equal((await handler('operator', 401)(operatorCall({}))).status, 401);
  assert.deepEqual(Object.keys(store.links), []);
  const ok = await handler('operator')(operatorCall({ action: 'create', link }));
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.links[0].code, link.code);
  assert.equal(body.base, 'https://www.jovamedia.com/go/');
  assert.equal((await handler('operator')(operatorCall({ action: 'create', link }))).status, 409);
  assert.equal((await handler('operator')(operatorCall({ action: 'create', link: { ...link, code: 'bad code' } }))).status, 400);
});
