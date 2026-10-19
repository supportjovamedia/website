import { test } from "node:test";
import assert from "node:assert/strict";
import { websiteTypes, websitePath, websiteQuotePath } from "../lib/website-catalogue.mjs";
import { websiteNavigation } from "../lib/website-navigation.mjs";
import { productById } from "../lib/products.mjs";
import { validateQuote } from "../lib/quote-fields.mjs";
import { createQuoteHandler } from "../lib/quote-delivery.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));

test("the hub and all website detail pages have canonical search metadata and a usable enquiry route", async () => {
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
  assert.equal(websiteTypes.length, 11);
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

test("salon website content moves once to Websites and the sitemap lists only its new canonical", async () => {
  const old = await fetch(base + "/services/salon-website-design", { redirect: "manual" });
  assert.equal(old.status, 308);
  assert.equal(new URL(old.headers.get("location"), base).pathname, "/websites/salon-website-design");
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  assert.ok(xml.includes("https://www.jovamedia.com/websites/salon-website-design</loc>"));
  assert.ok(!xml.includes("/services/salon-website-design"));
  assert.ok(!xml.includes("/services/web-design"));
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const path of ["/", "/websites", "/websites/business-websites", "/websites/booking-systems", "/pricing", ...websiteTypes.map(item => websitePath(item.slug))]) {
    const html = (await (await fetch(base + path)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.ok(!html.includes('href="/services/salon-website-design'), path + " retains a retired internal link");
  }
});

test("photography is not repeated within or between the Websites pages", async () => {
  const placements = new Map(), hashes = new Map();
  for (const page of ["/websites", ...websiteTypes.map(item => websitePath(item.slug))]) {
    const html = await (await fetch(base + page)).text();
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
    for (const tag of main.matchAll(/<img\b[^>]*>/g)) {
      const src = tag[0].match(/\bsrc="([^"]*)"/)[1].replaceAll("&amp;", "&");
      const image = new URL(src, base);
      const asset = image.pathname === "/_next/image" ? new URL(image.searchParams.get("url"), base).pathname : image.pathname;
      assert.ok(!placements.has(asset), `${asset} is repeated on ${placements.get(asset)} and ${page}`);
      placements.set(asset, page);
      const bytes = await readFile(new URL("../public" + asset, import.meta.url));
      const hash = createHash("sha256").update(bytes).digest("hex");
      assert.ok(!hashes.has(hash), `${asset} duplicates the pixels in ${hashes.get(hash)}`);
      hashes.set(hash, asset);
      assert.match(tag[0], /alt="[^"]{15,}"/, page);
    }
  }
  assert.ok(placements.size >= 80, "The pages need distinct supporting photography, not an empty layout");
});

test("each service has a descriptive main heading, meaningful media and distinct buying guidance", async () => {
  const fit = text => text.toLowerCase().replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/<[^>]*>/g, " ");
  const descriptions = new Set();
  for (const item of websiteTypes) {
    const html = await (await fetch(base + websitePath(item.slug))).text();
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
    const h1 = fit(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
    assert.ok(h1.includes(item.primaryKeyword.toLowerCase()), `${item.slug}: service intent must be explicit in the main heading`);
    for (const section of item.detailSections) {
      assert.ok(fit(main).includes(fit(section.title)), `${item.slug}: missing service-specific heading`);
      descriptions.add(section.paragraphs.join(" "));
    }
    const images = [...main.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
    assert.ok(images.length >= 5, `${item.slug}: service guidance should have supporting visual sections`);
    assert.ok(images.every(image => /alt="[^"]{12,}"/.test(image)), `${item.slug}: meaningful imagery needs useful alternative text`);
    assert.doesNotMatch(main, /The garden house|Atelier \/ selected work|Workspace \/ interface study|data-website-eyebrow/);
    assert.ok(main.includes('id="planning"') && main.includes('id="questions"'));
    assert.ok(main.includes('href="/pricing"') && main.includes('href="/insights/small-business-website-cost-uk"'));
  }
  assert.equal(descriptions.size, 22, "the website services must not repeat the same buyer guidance");
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
