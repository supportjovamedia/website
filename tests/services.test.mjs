import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceRedirects } from "../lib/service-redirects.mjs";
const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");
const mainServices = ["system-modernization", "social-management", "brand-strategy", "content", "email-marketing", "seo"];

test("website design explains current public prices while other service pages avoid internal tiers", async () => {
  for (const path of ["/", "/services", ...[...mainServices, "seo"].map((s) => `/services/${s}`)]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.doesNotMatch(html, /Starter|Care Plus|\bTEAM [123]\b/, path);
    if (path === "/services/web-design") { for(const price of ["£350","£550","£2,000"]) assert.ok(html.includes(price),price); }
    else assert.doesNotMatch(html, /<table[\s>]/, path);
    if (path.startsWith("/services/")) {
      assert.match(html, /The right support/, path);
      assert.match(html, /Get a Quote/, path);
    }
  }
});
test("homepage retains its website showcase while Services contains the six other services", async () => {
  for (const page of ["/", "/services"]) {
    const html = await (await fetch(base + page)).text();
    const start = page === "/" ? html.indexOf("data-service-story") : 0;
    assert.ok(start >= 0, "Homepage service showcase is present");
    const scope = page === "/" ? html.slice(start, html.indexOf("</section>", start)) : html;
    const serviceCards = [...scope.matchAll(/href="(\/websites|\/services\/[^"#?]+)"/g)].map((m) => m[1]);
    if (page === "/") assert.deepEqual([...new Set(serviceCards)].slice(0, 3), ["/websites", "/services/social-management", "/services/brand-strategy"]);
    else {
      const directory = scope.slice(scope.indexOf('id="services"'), scope.indexOf('id="faq"'));
      const cards = [...directory.matchAll(/href="\/services\/([^"]+)"/g)].map(m => m[1]);
      assert.deepEqual(cards, mainServices);
      assert.doesNotMatch(directory, /Website Design &amp; Development/);
    }
  }
});
test("old service URLs redirect directly to a current information page", async () => {
  for (const [source, target] of Object.entries(serviceRedirects)) {
    const response = await fetch(`${base}/services/${source}`, { redirect: "manual" });
    assert.equal(response.status, 308, source);
    const destination = target === "web-design" ? "/websites" : `/services/${target}`;
    assert.equal(new URL(response.headers.get("location"), base).pathname, destination);
    assert.equal((await fetch(base + destination)).status, 200);
  }
});
test("contact form asks for the short enquiry fields only", async () => {
  const html = await (await fetch(base + "/contact")).text();
  for (const field of ["firstName", "lastName", "email", "phone", "message"]) assert.ok(html.includes('name="' + field + '"'), field);
  assert.doesNotMatch(html, /<select|name="country"|name="budget"|name="company"/);
});
