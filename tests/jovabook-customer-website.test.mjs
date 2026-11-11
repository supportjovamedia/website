import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerWebsite, createCustomerWebsiteSitemap } from '../lib/jovabook-customer-website.mjs';

const env = {
  JOVABOOK_SUPABASE_URL: 'https://website-fixture.example.test',
  JOVABOOK_SUPABASE_PUBLISHABLE_KEY: 'fixture-key',
};
const business = {
  slug: 'fictional-studio', name: 'Fictional <Studio>', searchable: true,
  about: 'Haircuts and styling in a fictional town.',
  services: [{ name: 'Haircut', price: 25 }], address: '',
  workspace: { website: { headline: 'Visit <our> studio', template: 'one-page' } },
};
const render = (fetch, options = {}) => createCustomerWebsite({ env: { ...env, ...options }, send: fetch })(
  null, { params: Promise.resolve({ slug: business.slug }) },
);

test('published opted-in website renders crawlable business content and the existing booking destination', async () => {
  let requests = 0;
  const response = await render(async (url, request) => {
    requests++;
    assert.equal(url, 'https://website-fixture.example.test/rest/v1/rpc/public_customer_website');
    assert.deepEqual(JSON.parse(request.body), { p_slug: business.slug });
    assert.equal(request.cache, 'no-store');
    return Response.json(business);
  });
  assert.equal(response.status, 200);
  assert.equal(requests, 1);
  assert.equal(response.headers.get('X-Robots-Tag'), null);
  const html = await response.text();
  assert.match(html, /<title>Fictional &lt;Studio&gt;<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.jovamedia\.com\/book\/fictional-studio"/);
  assert.match(html, /href="https:\/\/www\.jovamedia\.com\/book\/fictional-studio\?view=booking"/);
  assert.match(html, /href="#services"/);
  assert.match(html, /id="services"/);
  assert.match(html, /Haircut/);
  assert.doesNotMatch(html, /<script\b|\/pricing/);
});

test('legacy website links redirect to /book and preserve their query', async () => {
  let reads = 0;
  const send = async () => { reads++; return Response.json({ ...business, slug: 'pricing' }); };
  const legacy = createCustomerWebsite({ env, send, redirectLegacy: true });
  const redirect = await legacy(new Request('https://www.jovamedia.com/sites/fictional-studio?utm_source=profile'), {
    params: { slug: 'fictional-studio' },
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('Location'), 'https://www.jovamedia.com/book/fictional-studio?utm_source=profile');
  const oldFallback = await legacy(null, { params: { slug: 'pricing' } });
  assert.equal(oldFallback.status, 308);
  assert.equal(oldFallback.headers.get('Location'), 'https://www.jovamedia.com/book/pricing');
  assert.equal(reads, 0);
  const fallback = await createCustomerWebsite({ env, send })(null, { params: { slug: 'pricing' } });
  assert.equal(fallback.status, 200);
  assert.match(await fallback.text(), /rel="canonical" href="https:\/\/www\.jovamedia\.com\/book\/pricing"/);
  assert.equal(reads, 1);
});

test('share-only and preview pages keep noindex, and unknown tenants return 404', async () => {
  const privateLink = await render(async () => Response.json({ ...business, searchable: false }));
  const preview = await render(async () => Response.json(business), { VERCEL_ENV: 'preview' });
  const unknown = await render(async () => Response.json(null));
  const unavailable = await render(async () => Response.error());
  for (const response of [privateLink, preview, unknown, unavailable]) {
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  }
  assert.equal(privateLink.status, 200);
  assert.equal(preview.status, 200);
  assert.equal(unknown.status, 404);
  assert.equal(unavailable.status, 503);
});

test('customer sitemap uses one bounded data request and publishes only safe canonical URLs', async () => {
  let requests = 0;
  const sitemap = createCustomerWebsiteSitemap({ env, send: async (url, request) => {
    requests++;
    assert.equal(url, 'https://website-fixture.example.test/rest/v1/rpc/customer_website_sitemap');
    assert.equal(request.cache, 'no-store');
    return Response.json(['fictional-studio', 'pricing', 'jova-demo', 'www', 'bad/<slug>']);
  } });
  const response = await sitemap();
  assert.equal(response.status, 200);
  assert.equal(requests, 1);
  const xml = await response.text();
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.match(xml, /<loc>https:\/\/www\.jovamedia\.com\/book\/fictional-studio<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.jovamedia\.com\/book\/pricing<\/loc>/);
});
