import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceRedirects } from "../lib/service-redirects.mjs";
const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");
const mainServices = ["web-design", "system-modernization", "social-management", "brand-strategy", "content", "email-marketing", "seo"];

test("public service pages have no commercial tables, prices or internal tiers", async () => {
  for (const path of ["/", "/services", ...[...mainServices, "seo"].map((s) => `/services/${s}`)]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.doesNotMatch(html, /£|&pound;|&#163;|Starter|Care Plus|Care Pro|From £|\bTEAM [123]\b|<table[\s>]/, path);
    if (path.startsWith("/services/")) {
      assert.match(html, /How we can help/, path);
      assert.match(html, /Discuss your project/, path);
    }
  }
});
test("homepage showcases three services and the directory retains all seven services", async () => {
  for (const page of ["/", "/services"]) {
    const html = await (await fetch(base + page)).text();
    const serviceCards = [...html.matchAll(/href="\/services\/([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(serviceCards)].slice(0, 8), page === "/" ? ["web-design", "social-management", "brand-strategy"] : mainServices, page);
  }
});
test("old service URLs redirect directly to a current information page", async () => {
  for (const [source, target] of Object.entries(serviceRedirects)) {
    const response = await fetch(`${base}/services/${source}`, { redirect: "manual" });
    assert.equal(response.status, 308, source);
    assert.equal(new URL(response.headers.get("location"), base).pathname, `/services/${target}`);
    assert.equal((await fetch(`${base}/services/${target}`)).status, 200);
  }
});
test("contact form asks for the short enquiry fields only", async () => {
  const html = await (await fetch(base + "/contact")).text();
  for (const field of ["firstName", "lastName", "email", "phone", "message"]) assert.ok(html.includes('name="' + field + '"'), field);
  assert.doesNotMatch(html, /<select|name="country"|name="budget"|name="company"/);
});
