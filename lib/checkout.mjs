import { createHash } from "node:crypto";
import { products, CATALOG_VERSION } from "./products.mjs";

const reply = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const reference = id => "JV-" + createHash("sha256").update(id).digest("hex").slice(0, 16).toUpperCase();
export function checkoutConfigured(env = process.env, catalog = products) {
  return env.CHECKOUT_ENABLED === "true" && env.COMMERCE_TERMS_APPROVED === "true" && /^sk_(?:test|live)_/.test(env.STRIPE_SECRET_KEY || "") && catalog.every(item => Number.isSafeInteger(item.amount) && item.amount > 0);
}
async function smallJson(request, limit = 4096) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error(); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function createCheckoutHandler({ env = process.env, catalog = products, stripe, now = Date.now } = {}) {
  const limits = new Map();
  return async function POST(request) {
    if (!checkoutConfigured(env, catalog)) return reply(503, { error: "Online ordering is not available yet. Please request a free consultation to confirm your package." });
    const origin = new URL(request.url).origin;
    if (request.headers.get("origin") !== origin) return reply(403, { error: "Please open checkout from our website." });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Invalid request format." });
    let data;
    try { data = await smallJson(request); } catch { return reply(400, { error: "Please check your basket and try again." }); }
    const ids = data?.productIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > catalog.length || new Set(ids).size !== ids.length || !ids.every(id => catalog.some(item => item.id === id)) || data.termsAccepted !== true) return reply(400, { error: "Please review your packages and accept the terms." });
    if (ids.filter(id => catalog.find(item => item.id === id).interval).length > 1) return reply(400, { error: "Choose one care subscription per website." });
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!/^[a-f0-9-]{36}$/i.test(idempotencyKey || "")) return reply(400, { error: "Please refresh your basket and try again." });
    const time = now();
    for (const [key, entry] of limits) if (time - entry.start > 600000) limits.delete(key);
    const ip = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").digest("hex");
    const entry = limits.get(ip) || { start: time, keys: new Set() };
    if (!entry.keys.has(idempotencyKey) && entry.keys.size >= 10) return reply(429, { error: "Please wait a few minutes before trying checkout again." });
    entry.keys.add(idempotencyKey); if (limits.size >= 2000) limits.delete(limits.keys().next().value); limits.set(ip, entry);
    const items = ids.slice().sort().map(id => catalog.find(item => item.id === id));
    const subscription = items.some(item => item.interval);
    const amount = items.reduce((total, item) => total + item.amount, 0);
    const key = "jova-checkout-" + createHash("sha256").update(idempotencyKey + items.map(item => item.id).join(",") + amount + CATALOG_VERSION).digest("hex");
    try {
      const session = await stripe.checkout.sessions.create({
        mode: subscription ? "subscription" : "payment", payment_method_types: ["card"],
        line_items: items.map(item => ({ price_data: { currency: "gbp", unit_amount: item.amount, ...(item.interval ? { recurring: { interval: item.interval } } : {}), product_data: { name: item.name, description: item.description } }, quantity: 1 })),
        success_url: `${origin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/basket?checkout=cancelled`,
        billing_address_collection: "required", ...(!subscription ? { customer_creation: "always" } : {}),
        consent_collection: { terms_of_service: "required" },
        metadata: { source: "jovamedia-packages", catalog_version: CATALOG_VERSION, product_ids: items.map(item => item.id).join(","), expected_total: String(amount), billing_mode: subscription ? "subscription" : "payment", terms_version: "2026-10-draft" },
      }, { idempotencyKey: key });
      const url = new URL(session.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error();
      return reply(200, { url: session.url });
    } catch { return reply(502, { error: "We could not open secure checkout. Your basket is still here. Please try again or contact us." }); }
  };
}

// The redirect and query string alone are never evidence of payment.
export function paidOrder(session) {
  const ids = session?.metadata?.product_ids?.split(",");
  const amount = Number(session?.metadata?.expected_total);
  if (session?.metadata?.source !== "jovamedia-packages" || !["payment", "subscription"].includes(session.mode) || session.status !== "complete" || session.payment_status !== "paid" || session.currency !== "gbp" || !Number.isSafeInteger(amount) || amount <= 0 || session.amount_total !== amount || !Array.isArray(ids) || !ids.length || ids.length > products.length || new Set(ids).size !== ids.length || !ids.every(id => products.some(item => item.id === id))) return null;
  const monthly = ids.map(id => products.find(item => item.id === id)).filter(item => item.interval);
  if (monthly.length > 1 || session.mode !== (monthly.length ? "subscription" : "payment")) return null;
  return { recurringAmount: monthly.reduce((sum, item) => sum + item.amount, 0), reference: reference(session.id), productIds: ids, amount, currency: "GBP", test: !session.livemode };
}

export function createStripeWebhookHandler({ env = process.env, stripe, send = fetch } = {}) {
  return async function POST(request) {
    if (!env.STRIPE_WEBHOOK_SECRET || !env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL || !env.CONTACT_TO_EMAIL) return reply(503, { error: "Order notifications are unavailable." });
    const signature = request.headers.get("stripe-signature");
    if (!signature) return reply(400, { error: "Missing signature." });
    let event;
    try {
      const reader = request.body?.getReader(); if (!reader) throw new Error();
      const chunks = []; let size = 0;
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 65536) { await reader.cancel(); throw new Error(); } chunks.push(value); }
      event = stripe.webhooks.constructEvent(Buffer.concat(chunks), signature, env.STRIPE_WEBHOOK_SECRET);
    } catch { return reply(400, { error: "Invalid signature or payload." }); }
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return reply(200, { received: true });
    try {
      // Refresh from Stripe, including durable notification status, on every retry.
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      const order = paidOrder(session);
      if (!order) return reply(200, { received: true });
      if (session.metadata.order_notification === "sent") return reply(200, { received: true });
      const payload = { from: env.CONTACT_FROM_EMAIL, to: [env.CONTACT_TO_EMAIL], subject: `${order.test ? "TEST: " : ""}Paid JovaMedia package order ${order.reference}`, text: `Order: ${order.reference}\nMode: ${order.test ? "Test, no real payment" : "Live"}\nPackages: ${order.productIds.map(id => products.find(item => item.id === id).name).join(", ")}\nPaid now: GBP ${(order.amount / 100).toFixed(2)}\nMonthly renewal: GBP ${(order.recurringAmount / 100).toFixed(2)}\nCustomer: ${session.customer_details?.name || "See Stripe"}\nEmail: ${session.customer_details?.email || "See Stripe"}\n\nReview this order in your Stripe dashboard. Contact the customer to confirm the brief and next steps. Do not begin work based solely on a browser redirect.` };
      const response = await send("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `jova-order-${session.id}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error();
      await stripe.checkout.sessions.update(session.id, { metadata: { order_notification: "sent" } });
      return reply(200, { received: true });
    } catch { return reply(502, { error: "Order processing needs a retry." }); }
  };
}
