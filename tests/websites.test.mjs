import { test } from "node:test";
import assert from "node:assert/strict";
import { websiteTypes, websitePath, websiteQuotePath } from "../lib/website-catalogue.mjs";
import { websiteNavigation } from "../lib/website-navigation.mjs";
import { productById } from "../lib/products.mjs";
import { validateQuote } from "../lib/quote-fields.mjs";
import { createQuoteHandler } from "../lib/quote-delivery.mjs";

const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));

test("the hub and all ten detail pages have canonical search metadata and a usable enquiry route", async () => {
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  const hub = await (await fetch(base + "/websites")).text();
  const titles = new Set();
  const descriptions = new Set();
  for (const item of websiteTypes) {
    const path = websitePath(item.slug);
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1, path);
    assert.ok(html.includes(`rel="canonical" href="https://www.jovamedia.com${path}"`), path);
    assert.ok(sitemap.includes(`https://www.jovamedia.com${path}</loc>`), path);
    assert.ok(hub.includes(`href="${path}"`), path);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(!titles.has(title), title); titles.add(title);
    assert.ok(!descriptions.has(description), description); descriptions.add(description);
    const service = schemas(html).find(x => x["@type"] === "Service");
    assert.equal(service.url, `https://www.jovamedia.com${path}`);
    const trail = schemas(html).find(x => x["@type"] === "BreadcrumbList");
    assert.equal(trail.itemListElement[1].item, "https://www.jovamedia.com/websites");
    assert.equal(trail.itemListElement.at(-1).item, service.url);
    const quote = new URL(websiteQuotePath(item), base);
    assert.equal(quote.searchParams.get("website"), item.slug);
    if (item.product) assert.ok(productById(item.product), item.product);
    const form = (await (await fetch(quote)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.match(form, new RegExp(`<option[^>]*value="website-${item.slug}"[^>]*selected`), path);
    assert.doesNotMatch(html, /\u2014/);
  }
  assert.equal(websiteTypes.length, 10);
  assert.deepEqual(websiteNavigation.map(([, slug]) => slug), websiteTypes.map(item => item.slug));
  assert.ok(sitemap.includes("https://www.jovamedia.com/websites</loc>"));
  assert.ok(!sitemap.includes("https://www.jovamedia.com/services/web-design</loc>"));
});

test("the retired website service and its aliases redirect once to the new hub", async () => {
  for (const path of ["/services/web-design", "/services/business-digital-setup", "/services/hosting-support"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    assert.equal(response.status, 308, path);
    assert.equal(new URL(response.headers.get("location"), base).pathname, "/websites", path);
  }
  assert.equal((await fetch(base + "/websites/not-a-real-type")).status, 404);
});

test("website selection reaches the enquiry email using an injected transport only", async () => {
  const env = { RESEND_API_KEY: "test", CONTACT_FROM_EMAIL: "Website <hello@example.com>", CONTACT_TO_EMAIL: "inbox@example.com", RECAPTCHA_SECRET_KEY: "private-test-key" };
  for (const item of websiteTypes) {
    const data = { name: "Internal test", email: "test@example.com", phone: "", service: `website-${item.slug}`, product: item.product || "", recaptchaToken: "test-token" };
    assert.deepEqual(validateQuote(data).errors, {});
    let mail;
    const handler = createQuoteHandler({ env, verifyFetch: async () => Response.json({ success: true, hostname: "www.jovamedia.com" }), send: async (_url, init) => { mail = JSON.parse(init.body); return Response.json({ id: "test-receipt" }); } });
    const response = await handler(new Request("https://www.jovamedia.com/api/quote", { method: "POST", headers: { Origin: "https://www.jovamedia.com", "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(data) }));
    assert.equal(response.status, 200, item.slug);
    assert.ok(mail.text.includes(websiteNavigation.find(([, slug]) => slug === item.slug)[0]), item.slug);
  }
});
