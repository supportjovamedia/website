import { productionAnalyticsHost } from "./editorial-routes.mjs";

const tawkScriptId = "jova-tawk-script";
const crispScriptId = "jova-crisp-script";
const pendingLoads = new WeakSet();
const configuredWindows = new WeakSet();
export const crispWebsiteId = "47467104-8adc-4b11-95c0-ecd667dedff9";

export function chatAllowedOnPath(pathname = "/") {
  return !/^\/(?:preview|previews|checkout|booking|account)(?:\/|$)/.test(pathname);
}

function syncVisibility(win) {
  const visible = chatAllowedOnPath(win.location?.pathname);
  if (visible) win.Tawk_API?.showWidget?.();
  else win.Tawk_API?.hideWidget?.();
  win.$crisp?.push(["do", visible ? "chat:show" : "chat:hide"]);
}

function appendScript(doc, id, src) {
  if (doc.getElementById(id)) return;
  const script = doc.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  script.charset = "UTF-8";
  script.crossOrigin = "anonymous";
  script.onerror = () => script.remove();
  doc.body.appendChild(script);
}

// Shared with the isolated manual QA page. Normal website visits must use
// loadLiveChat below so local builds and client previews do not create visitors.
export function initialiseLiveChat(win, doc) {
  if (!chatAllowedOnPath(win.location?.pathname)) return;
  const tawk = win.Tawk_API = win.Tawk_API || {};
  const crisp = win.$crisp = win.$crisp || [];
  win.CRISP_WEBSITE_ID = crispWebsiteId;

  if (!configuredWindows.has(win)) {
    configuredWindows.add(win);
    const startedAt = Date.now();
    tawk.onLoad = () => syncVisibility(win);
    const openTawk = () => {
      if (!chatAllowedOnPath(win.location?.pathname)) return;
      win.$crisp?.push(["do", "chat:close"]);
      tawk.showWidget?.();
      tawk.maximize?.();
    };
    tawk.onChatMessageAgent = openTawk;
    tawk.onAgentJoinChat = openTawk;
    tawk.onChatMaximized = () => win.$crisp?.push(["do", "chat:close"]);
    // Keep both native launchers. Only a new operator message opens a chat;
    // page loads, visitor messages and old message updates never force it open.
    crisp.push(["config", "position:reverse", [true]]);
    crisp.push(["config", "sound:mute", [true]]);
    crisp.push(["on", "chat:opened", () => tawk.minimize?.()]);
    crisp.push(["on", "message:received", message => {
      if (!chatAllowedOnPath(win.location?.pathname)) return;
      if (!message || message.origin === "update" || ["note", "event"].includes(message.type)) return;
      if (message.from && message.from !== "operator") return;
      const timestamp = message.timestamp < 1e12 ? message.timestamp * 1000 : message.timestamp;
      if (Number.isFinite(timestamp) && timestamp < startedAt - 1000) return;
      tawk.minimize?.();
      win.$crisp?.push(["do", "chat:show"]);
      win.$crisp?.push(["do", "chat:open"]);
    }]);
  }

  syncVisibility(win);
  win.Tawk_LoadStart = win.Tawk_LoadStart || new Date();
  appendScript(doc, tawkScriptId, "https://embed.tawk.to/6ab052920dfa023441abcf65/1k30c5374");
  appendScript(doc, crispScriptId, "https://client.crisp.chat/l.js");
}

export function loadLiveChat(win, doc) {
  if (!productionAnalyticsHost(win.location?.hostname)) return;
  syncVisibility(win);
  if (!chatAllowedOnPath(win.location?.pathname)) return;
  if (doc.getElementById(tawkScriptId) && doc.getElementById(crispScriptId)) return;
  if (pendingLoads.has(win)) return;
  pendingLoads.add(win);
  const start = () => {
    pendingLoads.delete(win);
    initialiseLiveChat(win, doc);
  };
  const idle = () => {
    if (typeof win.requestIdleCallback === "function") win.requestIdleCallback(start, { timeout: 1500 });
    else win.setTimeout(start, 0);
  };
  // Do not compete with the hero assets or initial page hydration.
  if (doc.readyState === "complete") idle();
  else win.addEventListener("load", idle, { once: true });
}
