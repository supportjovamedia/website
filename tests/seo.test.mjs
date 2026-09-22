import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local tests only");
const meta = (html, key) =>
  html.match(
    new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`),
  )?.[1];
test("every indexable page has unique metadata, matching social URLs and valid organisation schema", async () => {
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const titles = new Set(),
    descriptions = new Set();
  for (const url of urls) {
    const html = await (await fetch(base + new URL(url).pathname)).text();
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = meta(html, "description");
    assert.ok(title);
    assert.ok(description);
    assert.ok(!titles.has(title), url + " duplicate title");
    assert.ok(!descriptions.has(description), url + " duplicate description");
    titles.add(title);
    descriptions.add(description);
    assert.equal(meta(html, "og:url"), url);
    assert.equal(meta(html, "og:description"), description);
    assert.equal(meta(html, "twitter:description"), description);
    assert.ok(!/noindex/.test(meta(html, "robots") || ""));
    const json = [
      ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    assert.ok(
      json.some((x) => x["@graph"]?.some((n) => n["@type"] === "Organization")),
    );
  }
});
test("service structured data and visible breadcrumbs agree with the canonical page", async () => {
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  for (const match of xml.matchAll(
    /<loc>(https:\/\/www\.jovamedia\.com\/services\/.*?)<\/loc>/g,
  )) {
    const url = match[1];
    const html = await (await fetch(base + new URL(url).pathname)).text();
    const data = [
      ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    const service = data.find((x) => x["@type"] === "Service");
    assert.equal(service.url, url);
    assert.equal(
      service.provider["@id"],
      "https://www.jovamedia.com/#organisation",
    );
    const trail = data.find((x) => x["@type"] === "BreadcrumbList");
    assert.equal(trail.itemListElement.at(-1).item, url);
    assert.match(html, /aria-label="Breadcrumb"/);
    assert.match(html, /Explore related services/);
  }
});
test("unfinished insights stay accessible but outside search index and sitemap", async () => {
  const response = await fetch(base + "/insights");
  assert.equal(response.status, 200);
  assert.match(meta(await response.text(), "robots"), /noindex/);
  assert.ok(
    !(await (await fetch(base + "/sitemap.xml")).text()).includes("/insights"),
  );
});

test("social previews use the current homepage capture and return a valid PNG", async () => {
  const expected = "https://www.jovamedia.com/share/jovamedia-homepage-2026-09.png";
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  for (const [,url] of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const response = await fetch(base + new URL(url).pathname, {headers:{"User-Agent":"Twitterbot/1.0"}});
    assert.equal(response.status, 200, url);
    const html = await response.text();
    assert.equal(meta(html, "og:image"), expected, url);
    assert.equal(meta(html, "twitter:image"), expected, url);
    assert.equal(html.match(/rel="canonical" href="([^"]+)"/)?.[1], url);
  }
  for (const path of [new URL(expected).pathname, "/opengraph-image", "/share/jovamedia-digital-partner", "/share/jovamedia-2026"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/png/);
    const data = Buffer.from(await response.arrayBuffer());
    assert.equal(data.subarray(1,4).toString(), "PNG");
    assert.equal(data.readUInt32BE(16), 1200);
    assert.equal(data.readUInt32BE(20), 630);
  }
});

test("renamed pages redirect permanently and robots permits discovery", async () => {
  for (const [from,to] of [["/services/legacy-software-updates","/services/system-modernization"],["/terms-of-service","/terms"]]) {
    const response = await fetch(base + from, {redirect:"manual"});
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.get("location"),base).pathname, to);
  }
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.match(robots, /User-Agent: \*/i);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/www\.jovamedia\.com\/sitemap.xml/);
});
