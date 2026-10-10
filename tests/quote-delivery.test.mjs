import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuoteHandler } from "../lib/quote-delivery.mjs";
import { validateQuote, quoteOptions } from "../lib/quote-fields.mjs";
import { eventPayload } from "../lib/marketing-analytics.mjs";
const env = { RESEND_API_KEY: "test", CONTACT_FROM_EMAIL: "Website <hello@example.com>", CONTACT_TO_EMAIL: "inbox@example.com", RECAPTCHA_SECRET_KEY: "private-captcha-key" };
const data = { name: "Test Visitor", email: "test@example.com", phone: "+44 7700 900123", service: "service-0", product: "landing-page", website: "", recaptchaToken: "fresh-token" };
const request = (body = data, headers = {}) => new Request("https://www.jovamedia.com/api/quote", { method: "POST", headers: { Origin: "https://www.jovamedia.com", "Content-Type": "application/json", "Idempotency-Key": "12345678-1234-1234-1234-123456789abc", ...headers }, body: JSON.stringify(body) });
const options = { env, verifyFetch: async () => Response.json({ success: true, hostname: "www.jovamedia.com" }) };

test("seven services and the unsure option can request contact without a phone, message or budget", async () => {
  assert.equal(quoteOptions.length, 8);
  for (const option of quoteOptions) assert.deepEqual(validateQuote({ ...data, service: option.value }).errors, {});
  assert.deepEqual(validateQuote({ ...data, phone: "" }).errors, {});
  assert.deepEqual(validateQuote({ name: data.name, email: data.email, service: "not-sure" }).errors, {});
  let mail;
  const handler = createQuoteHandler({ ...options, send: async (url, init) => { mail = JSON.parse(init.body); return Response.json({ id: "received" }); } });
  assert.equal((await handler(request())).status, 200);
  assert.equal(mail.subject, "New JovaMedia quote callback request");
  assert.deepEqual(mail.to, [env.CONTACT_TO_EMAIL]);
  assert.equal(mail.reply_to, data.email);
  assert.match(mail.text, /Landing Page/);
  assert.match(mail.text, /7700 900123/);
  assert.doesNotMatch(mail.text, /Budget|Country|undefined/);
  assert.equal((await handler(request({ ...data, phone: "", product: "web-care-pro" }))).status, 200);
  assert.match(mail.text, /Web Care Pro/);
  assert.match(mail.text, /please email to arrange contact/);
});
test("invalid callback fields, honeypots and origins never reach delivery", async () => {
  const handler = createQuoteHandler({ ...options, send: async () => assert.fail("Invalid data must not be delivered") });
  for (const change of [{ name: "" }, { name: "a\nb" }, { name: "x".repeat(101) }, { email: "bad" }, { phone: "123" }, { phone: "letters" }, { phone: "1234567890123456" }, { service: "fake-product" }, { service: "landing-page" }, { service: {} }, { website: "spam" }]) assert.equal((await handler(request({ ...data, ...change }))).status, 400, JSON.stringify(change));
  assert.equal((await handler(request(data, { Origin: "https://attacker.example" }))).status, 403);
});
test("callback sends only after CAPTCHA verification and confirmed provider receipt", async () => {
  const fail = async () => assert.fail("Must not send");
  assert.equal((await createQuoteHandler({ env: {}, send: fail })(request())).status, 503);
  assert.equal((await createQuoteHandler({ ...options, verifyFetch: async () => Response.json({ success: false }), send: fail })(request())).status, 400);
  for (const send of [async () => Response.json({}, { status: 403 }), async () => Response.json({}), async () => { throw Error("timeout"); }]) assert.equal((await createQuoteHandler({ ...options, send })(request())).status, 502);
});
test("callback retry identity is stable while new requests are rate limited", async () => {
  const keys = [];
  const handler = createQuoteHandler({ ...options, send: async (url, init) => { keys.push(init.headers["Idempotency-Key"]); return Response.json({ id: "received" }); } });
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request({ ...data, recaptchaToken: "retry-token" }))).status, 200);
  assert.equal(keys[0], keys[1]);
  for (let i = 1; i < 5; i++) assert.equal((await handler(request(data, { "Idempotency-Key": `12345678-1234-1234-1234-123456789ab${i}` }))).status, 200);
  assert.equal((await handler(request(data, { "Idempotency-Key": "12345678-1234-1234-1234-123456789ab9" }))).status, 429);
});
test("quote analytics drops contact fields and query parameters", () => {
  const payload = eventPayload("generate_lead", { form_id: "quote_callback", ...data }, "https://www.jovamedia.com/get-a-quote?product=landing-page&email=private@example.com");
  assert.equal(payload.form_id, "quote_callback");
  assert.equal(payload.page_location, "https://www.jovamedia.com/get-a-quote");
  assert.doesNotMatch(JSON.stringify(payload), /Test Visitor|test@example|7700|private@example/);
});
