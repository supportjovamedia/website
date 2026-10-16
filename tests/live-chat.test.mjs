import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLiveChat, initialiseLiveChat, chatAllowedOnPath, crispWebsiteId } from "../lib/live-chat.mjs";

function fixture(hostname = "www.jovamedia.com", pathname = "/") {
  const scripts = [], idle = [], timers = [], events = {};
  const doc = {
    readyState: "complete",
    getElementById: id => scripts.find(script => script.id === id),
    createElement: () => ({ remove() { scripts.splice(scripts.indexOf(this), 1); } }),
    body: { appendChild: script => scripts.push(script) },
  };
  const win = {
    location: { hostname, pathname },
    requestIdleCallback: callback => idle.push(callback),
    setTimeout: callback => timers.push(callback),
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  return { win, doc, scripts, idle, timers, events };
}
function received(win) { return win.$crisp.find(([type, event]) => type === "on" && event === "message:received")[2]; }
function opens(win) { return win.$crisp.filter(([type, action]) => type === "do" && action === "chat:open").length; }

test("only native Crisp loads once after page load and idle, with sound muted", () => {
  const f = fixture();
  f.doc.readyState = "loading";
  loadLiveChat(f.win, f.doc);
  loadLiveChat(f.win, f.doc);
  assert.equal(f.scripts.length, 0);
  f.events.load();
  assert.equal(f.scripts.length, 0);
  assert.equal(f.idle.length, 1);
  f.idle[0]();
  loadLiveChat(f.win, f.doc);
  assert.equal(f.scripts.length, 1);
  assert.deepEqual(f.scripts.map(s => s.src), ["https://client.crisp.chat/l.js"]);
  assert.ok(f.scripts.every(s => s.async));
  assert.equal(f.win.CRISP_WEBSITE_ID, crispWebsiteId);
  assert.equal(f.win.$crisp.filter(([type, event]) => type === "on" && event === "message:received").length, 1);
  assert.ok(f.win.$crisp.some(([type, option, value]) => type === "config" && option === "position:reverse" && value[0] === true));
  assert.equal(opens(f.win), 0);
  assert.ok(f.win.$crisp.some(([type, option, value]) => type === "config" && option === "sound:mute" && value[0] === true));
  assert.equal(f.win.Tawk_API, undefined);
});

test("local and preview visits never connect to the production chat property", () => {
  for (const hostname of ["localhost", "127.0.0.1", "projectjovamedia.vercel.app", "jovamedia.com.example.com", undefined]) {
    const win = { location: { hostname } };
    loadLiveChat(win, { createElement: () => { throw new Error('Test visit tried to load live chat'); } });
    assert.equal(win.Tawk_API, undefined);
    assert.equal(win.Tawk_LoadStart, undefined);
    assert.equal(win.$crisp, undefined);
  }
});

test("Crisp operator replies open the chat, excluding old history, updates and user messages", () => {
  const f = fixture();
  initialiseLiveChat(f.win, f.doc);
  const handler = received(f.win);
  for (const message of [undefined, { from: "user" }, { origin: "update" }, { type: "event" }, { type: "note" }, { timestamp: 1 }]) handler(message);
  assert.equal(opens(f.win), 0);
  handler({ from: "operator", origin: "chat", type: "text", timestamp: Date.now() + 1 });
  assert.equal(opens(f.win), 1);
});

test("private routes neither load nor reopen chats; public navigation restores launchers", () => {
  for (const pathname of ["/preview/booking", "/previews/sumera/index.html", "/checkout/complete", "/booking", "/account/settings"]) {
    const f = fixture("www.jovamedia.com", pathname);
    assert.equal(chatAllowedOnPath(pathname), false);
    loadLiveChat(f.win, f.doc);
    assert.equal(f.idle.length, 0);
    assert.equal(f.scripts.length, 0);
  }
  const f = fixture();
  initialiseLiveChat(f.win, f.doc);
  f.win.location.pathname = "/preview/booking";
  loadLiveChat(f.win, f.doc);
  received(f.win)({ from: "operator" });
  assert.equal(opens(f.win), 0);
  assert.deepEqual(f.win.$crisp.at(-1), ["do", "chat:hide"]);
  f.win.location.pathname = "/pricing";
  loadLiveChat(f.win, f.doc);
  assert.deepEqual(f.win.$crisp.at(-1), ["do", "chat:show"]);
});

test("failed loads retry without duplicating callbacks", () => {
  const f = fixture();
  initialiseLiveChat(f.win, f.doc);
  const handler = received(f.win);
  f.scripts.find(s => s.id === "jova-crisp-script").onerror();
  loadLiveChat(f.win, f.doc);
  f.idle[0]();
  assert.equal(f.scripts.length, 1);
  assert.equal(received(f.win), handler);
});

test("browsers without requestIdleCallback use a deferred fallback", () => {
  const f = fixture();
  delete f.win.requestIdleCallback;
  loadLiveChat(f.win, f.doc);
  assert.equal(f.scripts.length, 0);
  f.timers[0]();
  assert.equal(f.scripts.length, 1);
});
