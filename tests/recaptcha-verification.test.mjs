import { test } from "node:test";
import assert from "node:assert/strict";
import { isRecaptchaConfigured, verifyRecaptcha } from "../lib/recaptcha-verification.mjs";

const env = { RECAPTCHA_SECRET_KEY: "private+secret&key" };
const verifyFor = hostname => async () => Response.json({ success: true, hostname });

test("verification sends only the secret and token to Google with a bounded timeout", async () => {
  const result = await verifyRecaptcha("visitor+token&value", { env, verifyFetch: async (url, options) => {
    assert.equal(url, "https://www.google.com/recaptcha/api/siteverify");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/x-www-form-urlencoded");
    assert.deepEqual(Object.fromEntries(new URLSearchParams(options.body)), {
      secret: env.RECAPTCHA_SECRET_KEY,
      response: "visitor+token&value",
    });
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    return Response.json({ success: true, hostname: "www.jovamedia.com" });
  } });
  assert.deepEqual(result, { ok: true });
});

test("unconfigured secrets and the public test secret cannot protect production", async () => {
  assert.equal(isRecaptchaConfigured({}), false);
  assert.equal(isRecaptchaConfigured({ RECAPTCHA_SECRET_KEY: "   " }), false);
  const testKey = { RECAPTCHA_SECRET_KEY: "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe" };
  assert.equal(isRecaptchaConfigured({ ...testKey, VERCEL_ENV: "production" }), false);
  assert.equal(isRecaptchaConfigured({ ...testKey, VERCEL_ENV: "preview" }), true);
});

test("token validation bounds outbound verification requests", async () => {
  const verifyFetch = async () => assert.fail("Malformed tokens must be rejected locally");
  for (const token of [undefined, null, false, 3, [], {}, "", "  ", "x".repeat(4097)]) {
    const result = await verifyRecaptcha(token, { env, verifyFetch });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
  assert.deepEqual(await verifyRecaptcha("x".repeat(4096), { env, verifyFetch: verifyFor("jovamedia.com") }), { ok: true });
});

test("only expected production hostnames are accepted regardless of environment overrides", async () => {
  const production = { ...env, VERCEL_ENV: "production", RECAPTCHA_ALLOWED_HOSTNAMES: "attacker.example,localhost" };
  for (const hostname of ["jovamedia.com", "www.jovamedia.com"]) {
    assert.deepEqual(await verifyRecaptcha("token", { env: production, verifyFetch: verifyFor(hostname) }), { ok: true });
  }
  for (const hostname of ["attacker.example", "localhost", "jovamedia.com.attacker.example", "sub.jovamedia.com", ""]) {
    assert.equal((await verifyRecaptcha("token", { env: production, verifyFetch: verifyFor(hostname) })).ok, false);
  }
});

test("preview and local development may use an explicit hostname list without suffix matching", async () => {
  const preview = { ...env, VERCEL_ENV: "preview", RECAPTCHA_ALLOWED_HOSTNAMES: " localhost, preview.example.com " };
  for (const hostname of ["localhost", "preview.example.com"]) {
    assert.deepEqual(await verifyRecaptcha("token", { env: preview, verifyFetch: verifyFor(hostname) }), { ok: true });
  }
  for (const hostname of ["jovamedia.com", "nested.preview.example.com", "preview.example.com.attacker.example"]) {
    assert.equal((await verifyRecaptcha("token", { env: preview, verifyFetch: verifyFor(hostname) })).ok, false);
  }
  assert.equal((await verifyRecaptcha("token", { env, verifyFetch: verifyFor("localhost") })).ok, false);
});

test("verification rejects unsuccessful or incomplete JSON and never trusts truthy success values", async () => {
  for (const body of [null, {}, [], { success: "true", hostname: "jovamedia.com" }, { success: true },
    { success: false, "error-codes": ["timeout-or-duplicate"] }]) {
    const result = await verifyRecaptcha("token", { env, verifyFetch: async () => Response.json(body) });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
});

test("upstream failures produce a recoverable unavailable result", async () => {
  for (const verifyFetch of [
    async () => Response.json({}, { status: 500 }),
    async () => new Response("invalid JSON"),
    async () => { throw new DOMException("Timed out", "TimeoutError"); },
  ]) {
    const result = await verifyRecaptcha("token", { env, verifyFetch });
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
  }
});
