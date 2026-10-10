import { products, productById } from "./products.mjs";
export const CONSENT_KEY = "jovamedia-consent-v2";
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export function readConsent(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(CONSENT_KEY));
    return value && Number.isFinite(value.time) && value.time <= now && now - value.time < CONSENT_MAX_AGE && ["accepted", "rejected"].includes(value.choice) ? value.choice : null;
  } catch { return null; }
}

export function browserConsent() {
  try { return readConsent(window.localStorage); } catch { return null; }
}

export function publicPage(pathname) {
  return /^\/(?:|about|contact|get-a-quote|consultation|pricing|products|basket|checkout\/complete|services(?:\/[a-z0-9-]+)?|work|insights|share\/(?:jovamedia-2026|jovamedia-digital-partner)|privacy-policy|terms|faq|blog(?:\/[a-z0-9-]+)?)$/.test(pathname);
}

export function measurementUrl(value) {
  const url = new URL(value);
  const query = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const entry = url.searchParams.get(key);
    if (entry && /^[a-zA-Z0-9_.-]{1,100}$/.test(entry)) query.set(key, entry);
  }
  url.search = query.toString();
  url.hash = "";
  return url.toString();
}

export function replaySafeUrl(value) {
  const url = new URL(value);
  return !url.pathname.startsWith("/checkout/") && publicPage(url.pathname) && ["", "#services", "#work", "#studio", "#contact", "#main-content", "#home", "#top"].includes(url.hash) && [...url.searchParams.keys()].every(key => /^utm_(source|medium|campaign|content|term)$/.test(key)) && [...url.searchParams.values()].every(value => /^[a-zA-Z0-9_.-]{1,100}$/.test(value));
}

const eventNames = new Set(["page_view", "select_content", "contact_click", "form_start", "form_submit", "generate_lead", "form_error", "scroll_depth", "ui_click", "consultation_click", "quote_click", "view_item_list", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "checkout_error", "purchase"]);
const channels = new Set(["email", "phone", "whatsapp", "contact_page", "navigation", "outbound"]);

export function eventPayload(name, fields, href) {
  const url = new URL(href);
  if (!eventNames.has(name) || !publicPage(url.pathname)) return null;
  const result = { page_path: url.pathname, page_location: measurementUrl(href) };
  if (channels.has(fields.channel)) result.channel = fields.channel;
  if (fields.destination && publicPage(fields.destination)) result.destination = fields.destination;
  if (["contact_enquiry", "website_consultation", "quote_callback"].includes(fields.form_id)) result.form_id = fields.form_id;
  if (["hero", "hero_preview", "home_intro", "home_packages", "products", "pricing", "basket", "other"].includes(fields.placement)) result.placement = fields.placement;
  const ids = fields.product_ids || (fields.product_id ? [fields.product_id] : []);
  if (Array.isArray(ids) && ids.length && ids.length <= products.length && new Set(ids).size === ids.length && ids.every(productById)) {
    result.currency = "GBP";
    result.items = ids.map(id => ({ item_id: id, item_name: productById(id).name, quantity: 1 }));
    if (Number.isFinite(fields.value) && fields.value > 0 && fields.value <= 100000) result.value = fields.value;
  }
  if (name === "purchase") {
    if (!/^JV-[A-F0-9]{16}$/.test(fields.transaction_id || "") || !result.items || !result.value) return null;
    result.transaction_id = fields.transaction_id;
  }
  if ([25, 50, 75, 90].includes(fields.percent_scrolled)) result.percent_scrolled = fields.percent_scrolled;
  if (["link", "button"].includes(fields.element_type)) result.element_type = fields.element_type;
  return result;
}

export function trackEvent(name, fields = {}) {
  if (typeof window === "undefined" || !window.__jovaAnalytics || browserConsent() !== "accepted") return;
  const payload = eventPayload(name, fields, window.location.href);
  if (!payload) return;
  window.dataLayer?.push({ event: `jova_${name}`, ...payload });
  if (window.__jovaAnalytics.ga) window.gtag?.("event", name, payload);
  if (window.__jovaAnalytics.clarity) window.clarity?.("event", name);
  return true;
}

export function revokeTracking() {
  if (typeof window === "undefined") return;
  if (window.__jovaAnalytics?.gaId) window[`ga-disable-${window.__jovaAnalytics.gaId}`] = true;
  window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.clarity?.("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
  window.__jovaAnalytics = null;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!/^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|_clck$|_clsk$)/.test(name)) continue;
    for (const domain of ["", window.location.hostname, ".jovamedia.com"]) {
      document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ""} SameSite=Lax`;
    }
  }
}
