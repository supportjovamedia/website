import { test } from "node:test";
import assert from "node:assert/strict";

const base = process.env.TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local tests only");

test("retired booking and Sumera preview pages, APIs and assets return real 404s", async () => {
  for (const path of ["/preview/booking", "/preview/booking/admin", "/preview/admin", "/preview/booking/account", "/preview/booking/confirmation", "/preview/booking/legal/modern-slavery", "/preview/booking/api/public/catalog", "/preview/booking/api/dashboard", "/previews/sumera", "/previews/sumera/index.html", "/previews/sumera/style.css"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    assert.equal(response.status, 404, path);
  }
});

test("Aleiman remains accessible while the booking service offer remains separate from its retired demo", async () => {
  assert.equal((await fetch(base + "/previews/aleiman/index.html")).status, 200);
  assert.equal((await fetch(base + "/websites/booking-systems")).status, 200);
});
