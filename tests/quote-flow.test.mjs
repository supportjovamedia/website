import { test } from "node:test";
import assert from "node:assert/strict";
import { products } from "../lib/products.mjs";
const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");

test("product quote links retain each selected product in the short form", async () => {
  for (const product of products) {
    const response = await fetch(`${base}/get-a-quote?product=${product.id}`);
    assert.equal(response.status, 200);
    const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.match(html, /<option[^>]*value="service-0"[^>]*selected/);
    assert.match(html, new RegExp(`<input[^>]*name="product"[^>]*value="${product.id}"`));
    assert.equal((html.match(/<option\b/g) || []).length, 9);
    assert.doesNotMatch(html, /<optgroup|All fields are required/);
    assert.match(html, /Phone number.*?optional/);
    const phone = html.match(/<input[^>]*name="phone"[^>]*>/)[0];
    assert.doesNotMatch(phone, /required/);
    for (const name of ["name", "email", "phone", "service"]) assert.ok(html.includes(`name="${name}"`));
    assert.doesNotMatch(html, /<textarea|name="message"|name="budget"|name="country"|Add to basket/);
    assert.match(html, /aria-label="Selected package"/);
    assert.ok(html.includes(product.name));
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  }
});
test("retired purchase and consultation paths send visitors to the quote flow", async () => {
  for (const path of ["/basket", "/consultation"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/get-a-quote");
  }
  const response = await fetch(base + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ productIds: ["landing-page"], termsAccepted: true }) });
  assert.equal(response.status, 410);
  assert.equal((await response.json()).destination, "/get-a-quote");
});
