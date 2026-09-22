const scriptId = "jova-tawk-script";
const widgetUrl = "https://embed.tawk.to/6ab052920dfa023441abcf65/1k30c5374";

export function loadLiveChat(win, doc) {
  const api = win.Tawk_API = win.Tawk_API || {};
  // Keep the native widget visible so agent messages and unread indicators
  // are never hidden behind a custom support menu.
  api.onLoad = () => api.showWidget();
  if (typeof api.showWidget === "function") api.showWidget();
  if (doc.getElementById(scriptId)) return;
  win.Tawk_LoadStart = new Date();
  const script = doc.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = widgetUrl;
  script.charset = "UTF-8";
  script.crossOrigin = "anonymous";
  doc.body.appendChild(script);
}
