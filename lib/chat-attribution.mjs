import { publicPage, measurementUrl } from "./marketing-analytics.mjs";

const sessions = new WeakMap();
const campaignKeys = ["source", "medium", "campaign", "content", "term"];
const safeLabel = value => typeof value === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(value);

function stateFor(win) {
  if (!sessions.has(win)) sessions.set(win, { accepted: false, installed: false, ready: false, first: null, latest: null, current: null, sent: "" });
  return sessions.get(win);
}

function sourceContext(win, doc) {
  try {
    const url = new URL(measurementUrl(win.location.href));
    if (!publicPage(url.pathname)) return null;
    let referrer = "";
    try { referrer = new URL(doc.referrer).hostname; } catch { /* No external referrer. */ }
    const campaign = Object.fromEntries(campaignKeys.map(key => [key, url.searchParams.get(`utm_${key}`) || ""]));
    return { page: url.pathname, referrer, campaign };
  } catch { return null; }
}

// Capture only after optional analytics consent. No cookies, fingerprints,
// session resets, extra scripts, timers or first-party HTTP calls are added.
export function captureChatAttribution(win, doc, consent) {
  const state = stateFor(win);
  state.accepted = consent === "accepted";
  if (!state.accepted) {
    state.first = state.latest = state.current = null;
    state.sent = "";
    return;
  }
  const context = sourceContext(win, doc);
  state.current = context;
  if (!context) return;
  state.first ||= context;
  if (Object.values(context.campaign).some(Boolean)) state.latest = context.campaign;
  sendContext(win, state);
}

function sendContext(win, state) {
  if (!state.accepted || !state.ready || !state.current) return;
  const fields = { marketing_page: state.current.page };
  // Crisp owns session persistence. Read its existing first touch on load so
  // reloads and another tab do not overwrite it with an internal page.
  const previous = key => { try { return win.$crisp.get?.("session:data", key); } catch { return undefined; } };
  const previousPage = previous("marketing_first_page");
  if (!(typeof previousPage === "string" && publicPage(previousPage))) {
    fields.marketing_first_page = state.first.page;
    fields.marketing_first_referrer = state.first.referrer;
    for (const key of campaignKeys) fields[`marketing_first_${key}`] = state.first.campaign[key];
  }
  if (state.latest) for (const key of campaignKeys) fields[`marketing_latest_${key}`] = state.latest[key];
  const source = state.latest?.source || previous("marketing_latest_source");
  if (safeLabel(source)) fields.marketing_qa = source === "campaign_qa";
  const signature = JSON.stringify(fields);
  if (signature === state.sent) return;
  try {
    win.$crisp.push(["set", "session:data", [Object.entries(fields)]]);
    state.sent = signature;
  } catch { /* Optional context must never interrupt live chat. */ }
}

export function connectChatAttribution(win) {
  const state = stateFor(win);
  if (state.installed) return;
  state.installed = true;
  win.$crisp.push(["on", "session:loaded", () => {
    state.ready = true;
    state.sent = "";
    sendContext(win, state);
  }]);
}
