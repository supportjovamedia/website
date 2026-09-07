import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceRedirects } from "../lib/service-redirects.mjs";
const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");
const mainServices = ["web-design", "content", "social-management", "brand-strategy", "email-marketing", "content-production"];

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
test("homepage presents the six intended services in order", async () => {
  const html = await (await fetch(base)).text();
  const serviceCards = [...html.matchAll(/href="\/services\/([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(serviceCards.slice(0, 6), mainServices);
});
test("old service URLs redirect directly to a current information page", async () => {
  for (const [source, target] of Object.entries(serviceRedirects)) {
    const response = await fetch(`${base}/services/${source}`, { redirect: "manual" });
    assert.equal(response.status, 308, source);
    assert.equal(new URL(response.headers.get("location"), base).pathname, `/services/${target}`);
    assert.equal((await fetch(`${base}/services/${target}`)).status, 200);
  }
});
test("contact choices match the public services and exclude paid-media sales", async () => {
  const html = await (await fetch(base + "/contact")).text();
  for (const name of ["Website Development", "Copywriting", "Social Media", "Brand Strategy &amp; Design", "Email Marketing &amp; Automation", "Content Production"]) assert.ok(html.includes(`<option>${name}</option>`), name);
  assert.doesNotMatch(html, /<option>Performance &amp; growth<\/option>|Social, content, paid media/);
});
