import test from "node:test";
import assert from "node:assert/strict";
import { createCheckoutHandler, createStripeWebhookHandler, paidOrder, checkoutConfigured } from "../lib/checkout.mjs";
import { products, validBasket } from "../lib/products.mjs";
const catalog = products.map((item, index) => ({ ...item, amount: [45000, 55000, 200000][index] })); // Test fixtures, not published prices.
const env = { CHECKOUT_ENABLED: "true", COMMERCE_TERMS_APPROVED: "true", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", RESEND_API_KEY: "fixture", CONTACT_FROM_EMAIL: "Website <hello@example.com>", CONTACT_TO_EMAIL: "business@example.com" };
const request = (body = { productIds: ["landing-page"], termsAccepted: true }, headers = {}) => new Request("https://www.jovamedia.com/api/checkout", { method: "POST", headers: { origin: "https://www.jovamedia.com", "content-type": "application/json", "idempotency-key": "12345678-1234-1234-1234-123456789abc", ...headers }, body: JSON.stringify(body) });
const paid = { id: "cs_test_12345678901234567890", mode: "payment", status: "complete", payment_status: "paid", currency: "gbp", amount_total: 45000, livemode: false, metadata: { source: "jovamedia-packages", product_ids: "landing-page", expected_total: "45000" }, customer_details: { name: "Private Customer", email: "private@example.com" } };

test("checkout is disabled until all prices, credentials and commercial terms are approved", async () => {
  assert.equal(checkoutConfigured({ ...env, CHECKOUT_ENABLED: "false" }, products), false);
  for (const missing of [{ ...env, CHECKOUT_ENABLED: "false" }, { ...env, STRIPE_SECRET_KEY: "" }, { ...env, COMMERCE_TERMS_APPROVED: "false" }]) {
    assert.equal((await createCheckoutHandler({ env: missing, catalog, stripe: {} })(request())).status, 503);
  }
  assert.equal(validBasket(["landing-page", "landing-page"]), false);
  assert.equal(validBasket(["attacker"]), false);
});
test("server prices override client amount and retries reuse the same Stripe key", async () => {
  const calls = [];
  const handler = createCheckoutHandler({ env, catalog, stripe: { checkout: { sessions: { create: async (...args) => { calls.push(args); return { url: "https://checkout.stripe.com/c/pay/test-session" }; } } } } });
  for (let i = 0; i < 2; i++) assert.equal((await handler(request({ productIds: ["landing-page", "business-website"], termsAccepted: true, amount: 1, currency: "usd", success_url: "https://evil.example" }))).status, 200);
  assert.deepEqual(calls[0][0].line_items.map(item => item.price_data.unit_amount), [55000, 45000]);
  assert.equal(calls[0][0].line_items[0].price_data.currency, "gbp");
  assert.equal(calls[0][1].idempotencyKey, calls[1][1].idempotencyKey);
  assert.equal(calls[0][0].success_url, "https://www.jovamedia.com/checkout/complete?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(calls[0][0].metadata.expected_total, "100000");
});
test("checkout rejects unwanted origins, product IDs, duplicate items, missing terms and oversized bodies", async () => {
  const handler = createCheckoutHandler({ env, catalog, stripe: { checkout: { sessions: { create: () => assert.fail("Invalid checkout must not reach Stripe") } } } });
  for (const body of [{ productIds: ["unknown"], termsAccepted: true }, { productIds: ["landing-page", "landing-page"], termsAccepted: true }, { productIds: [] }, { productIds: "landing-page" }, { productIds: ["landing-page"] }, { productIds: ["landing-page"], termsAccepted: true, junk: "x".repeat(5000) }]) assert.equal((await handler(request(body))).status, 400);
  assert.equal((await handler(request(undefined, { origin: "https://attacker.example" }))).status, 403);
  assert.equal((await handler(request(undefined, { "idempotency-key": "bad" }))).status, 400);
});
test("payment-provider failure cannot return a checkout URL or a paid order", async () => {
  for (const create of [async () => { throw new Error("secret provider details"); }, async () => ({ url: "https://attacker.example" })]) {
    const response = await createCheckoutHandler({ env, catalog, stripe: { checkout: { sessions: { create } } } })(request());
    assert.equal(response.status, 502); assert.doesNotMatch(JSON.stringify(await response.json()), /secret provider/);
  }
  for (const change of [{ payment_status: "unpaid" }, { status: "open" }, { amount_total: 1 }, { currency: "usd" }, { metadata: { ...paid.metadata, product_ids: "unknown" } }, { metadata: { ...paid.metadata, expected_total: "NaN" } }]) assert.equal(paidOrder({ ...paid, ...change }), null);
  const order = paidOrder(paid); assert.equal(order.amount, 45000); assert.equal(order.test, true); assert.equal(order.productIds[0], "landing-page");
  assert.doesNotMatch(JSON.stringify(order), /Private|private@|cs_test_/);
});
const webhookRequest = () => new Request("https://www.jovamedia.com/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "signed" }, body: "signed-body" });
test("webhook rejects invalid signatures and never notifies for unpaid sessions", async () => {
  const invalid = createStripeWebhookHandler({ env, stripe: { webhooks: { constructEvent: () => { throw new Error(); } } } });
  assert.equal((await invalid(webhookRequest())).status, 400);
  const handler = createStripeWebhookHandler({ env, stripe: { webhooks: { constructEvent: () => ({ type: "checkout.session.completed", data: { object: paid } }) }, checkout: { sessions: { retrieve: async () => ({ ...paid, payment_status: "unpaid" }) } } }, send: () => assert.fail("Unpaid orders must not notify") });
  assert.equal((await handler(webhookRequest())).status, 200);
});
test("verified paid orders notify the configured inbox once and retain durable deduplication", async () => {
  let session = structuredClone(paid); const emails = [];
  const stripe = { webhooks: { constructEvent: () => ({ type: "checkout.session.completed", data: { object: { id: paid.id } } }) }, checkout: { sessions: { retrieve: async () => session, update: async (id, update) => { assert.equal(id, paid.id); session.metadata = { ...session.metadata, ...update.metadata }; } } } };
  const handler = createStripeWebhookHandler({ env, stripe, send: async (url, options) => { emails.push({ url, ...options }); return Response.json({ id: "mail-id" }); } });
  assert.equal((await handler(webhookRequest())).status, 200);
  assert.equal((await handler(webhookRequest())).status, 200);
  assert.equal(emails.length, 1);
  assert.equal(JSON.parse(emails[0].body).to[0], "business@example.com");
  assert.match(JSON.parse(emails[0].body).subject, /^TEST:/);
  assert.equal(emails[0].headers["Idempotency-Key"], `jova-order-${paid.id}`);
});
test("failed order notification returns a retryable status and does not mark sent", async () => {
  const stripe = { webhooks: { constructEvent: () => ({ type: "checkout.session.completed", data: { object: { id: paid.id } } }) }, checkout: { sessions: { retrieve: async () => paid, update: () => assert.fail("Rejected notifications must not be marked sent") } } };
  assert.equal((await createStripeWebhookHandler({ env, stripe, send: async () => Response.json({ error: "rejected" }, { status: 500 }) })(webhookRequest())).status, 502);
});
