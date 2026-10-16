import { test } from "node:test";
import assert from "node:assert/strict";
import { enquiryAttributionText, sanitiseEnquiryAttribution } from "../lib/enquiry-attribution.mjs";
import { CONSENT_KEY, CONSENT_MAX_AGE, enquiryAttribution, campaignAttribution, revokeTracking, eventPayload } from "../lib/marketing-analytics.mjs";
import { createContactHandler } from "../lib/contact-delivery.mjs";
import { createQuoteHandler } from "../lib/quote-delivery.mjs";

const labels = { consent: "accepted", source: "tiktok", medium: "social", campaign: "design-showcase", content: "three-industries-01-trending-sound" };
const tagged = "https://www.jovamedia.com/?utm_source=tiktok&utm_medium=social&utm_campaign=design-showcase&utm_content=three-industries-01-trending-sound";

function browser(choice = "accepted", time = Date.now()) {
  let consent = JSON.stringify({ choice, time });
  const stored = new Map();
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  globalThis.window = { location: new URL(tagged), localStorage: { getItem: key => key === CONSENT_KEY ? consent : null }, sessionStorage: storage };
  return { storage, setConsent: value => { consent = value; } };
}

test("consented landing tags survive internal navigation into an enquiry email", () => {
  const { storage } = browser();
  try {
    campaignAttribution(tagged, storage);
    window.location = new URL("https://www.jovamedia.com/contact");
    assert.deepEqual(enquiryAttribution(), labels);
    assert.match(enquiryAttributionText(enquiryAttribution()), /source: tiktok\nmedium: social\ncampaign: design-showcase\ncontent: three-industries-01-trending-sound/);
    window.location = new URL("https://www.jovamedia.com/?utm_source=nextdoor&utm_content=n02");
    assert.deepEqual(enquiryAttribution(), { consent: "accepted", source: "nextdoor", content: "n02" });
  } finally { delete globalThis.window; }
});

test("no consent, stale consent, withdrawal and excluded pages omit optional source data", () => {
  assert.equal(enquiryAttribution(), undefined);
  const { setConsent } = browser();
  try {
    assert.deepEqual(enquiryAttribution(), labels);
    for (const value of [null, "corrupt", JSON.stringify({ choice: "rejected", time: Date.now() }), JSON.stringify({ choice: "accepted", time: Date.now() - CONSENT_MAX_AGE }), JSON.stringify({ choice: "accepted", time: Date.now() + 10000 })]) {
      setConsent(value);
      assert.equal(enquiryAttribution(), undefined);
      assert.equal(JSON.stringify({ message: "Still deliver this enquiry", campaignAttribution: enquiryAttribution() }), '{"message":"Still deliver this enquiry"}');
    }
    setConsent(JSON.stringify({ choice: "accepted", time: Date.now() }));
    window.location = new URL("https://www.jovamedia.com/preview/booking?utm_source=nextdoor");
    assert.equal(enquiryAttribution(), undefined);
  } finally { delete globalThis.window; }
});

test("blocked storage cannot break an enquiry and withdrawal clears retained tags", () => {
  const { storage, setConsent } = browser();
  try {
    assert.deepEqual(enquiryAttribution(), labels);
    globalThis.document = { cookie: "" };
    revokeTracking();
    setConsent(JSON.stringify({ choice: "rejected", time: Date.now() }));
    assert.equal(storage.getItem("jova-campaign-session"), null);
    assert.equal(enquiryAttribution(), undefined);
    Object.defineProperty(window, "localStorage", { get() { throw Error("blocked"); } });
    assert.equal(enquiryAttribution(), undefined);
  } finally { delete globalThis.window; delete globalThis.document; }
});

test("server accepts only bounded labels with an explicit accepted consent marker", () => {
  for (const value of [null, [], "source=tiktok", {}, { ...labels, consent: false }, { ...labels, consent: "rejected" }]) {
    assert.deepEqual(sanitiseEnquiryAttribution(value), {});
    assert.equal(enquiryAttributionText(value), "");
  }
  for (const invalid of ["private@example.com", "https://private.example/", "facebook\n", "facebook\r\nBcc:private@example.com", "", "x".repeat(101), 123, {}, ["facebook"]]) {
    assert.deepEqual(sanitiseEnquiryAttribution({ ...labels, source: invalid }), { medium: "social", campaign: "design-showcase", content: "three-industries-01-trending-sound" });
  }
  assert.deepEqual(sanitiseEnquiryAttribution({ ...labels, email: "private@example.com", phone: "123456789", url: "https://private.example/", message: "private" }), { source: "tiktok", medium: "social", campaign: "design-showcase", content: "three-industries-01-trending-sound" });
});

const env = { RESEND_API_KEY: "test-key", CONTACT_FROM_EMAIL: "Website <hello@example.com>", CONTACT_TO_EMAIL: "inbox@example.com", RECAPTCHA_SECRET_KEY: "test-secret" };
const base = { name: "Test Visitor", email: "test@example.com", service: "General enquiry", message: "Please help with our website.", website: "", recaptchaToken: "test-captcha" };
const request = (data, route = "contact") => new Request(`https://www.jovamedia.com/api/${route}`, { method: "POST", headers: { Origin: "https://www.jovamedia.com", "Content-Type": "application/json", "Idempotency-Key": "12345678-1234-1234-1234-123456789abc" }, body: JSON.stringify(data) });

test("contact, consultation and quote delivery carry safe source labels to the configured inbox", async () => {
  const scenarios = [
    { create: createContactHandler, data: base, route: "contact", subject: "New JovaMedia website enquiry" },
    { create: createContactHandler, data: { ...base, country: "GB", service: "Free website consultation" }, route: "contact", subject: "New JovaMedia free consultation request" },
    { create: createQuoteHandler, data: { name: base.name, email: base.email, service: "not-sure", website: "", recaptchaToken: "test-captcha" }, route: "quote", subject: "New JovaMedia quote request" },
  ];
  for (const { create, data, route, subject } of scenarios) {
    const delivered = [];
    const handler = create({ env, verifyFetch: async () => Response.json({ success: true, hostname: "www.jovamedia.com" }), send: async (url, init) => { delivered.push({ mail: JSON.parse(init.body), key: init.headers["Idempotency-Key"] }); return Response.json({ id: "test-receipt" }); } });
    assert.equal((await handler(request({ ...data, campaignAttribution: { ...labels, email: "must-not-append@example.com" } }, route))).status, 200);
    assert.equal((await handler(request({ ...data, recaptchaToken: "fresh-retry-token", campaignAttribution: labels }, route))).status, 200);
    const mail = delivered[0].mail;
    assert.equal(mail.subject, subject);
    assert.deepEqual(mail.to, [env.CONTACT_TO_EMAIL]);
    assert.equal(mail.reply_to, data.email);
    assert.match(mail.text, /Marketing source \(optional, visitor-reported\):\nsource: tiktok/);
    assert.doesNotMatch(mail.text, /must-not-append|recaptcha|test-captcha/);
    assert.equal(delivered[0].key, delivered[1].key);
    assert.equal(JSON.stringify(delivered[0].mail), JSON.stringify(delivered[1].mail));
  }
});

test("missing, declined or invalid attribution never blocks delivery or invents a source", async () => {
  for (const campaignAttribution of [undefined, { ...labels, consent: "rejected" }, { consent: "accepted", source: "private@example.com" }]) {
    let mail;
    const handler = createContactHandler({ env, verifyFetch: async () => Response.json({ success: true, hostname: "www.jovamedia.com" }), send: async (url, init) => { mail = JSON.parse(init.body); return Response.json({ id: "test-receipt" }); } });
    assert.equal((await handler(request({ ...base, campaignAttribution }))).status, 200);
    assert.doesNotMatch(mail.text, /Marketing source|private@example.com|source:|direct|organic/);
  }
});

test("optional enquiry source does not add personal data or receipt identity to analytics", () => {
  const event = eventPayload("generate_lead", { form_id: "contact_enquiry", email: base.email, name: base.name, message: base.message, campaignAttribution: labels }, "https://www.jovamedia.com/contact");
  assert.deepEqual(event, { page_path: "/contact", page_location: "https://www.jovamedia.com/contact", form_id: "contact_enquiry" });
});
