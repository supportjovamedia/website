import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLiveChat } from "../lib/live-chat.mjs";

test("native chat loads once and remains visible without intercepting messages or minimize", () => {
  const scripts = [];
  const doc = { getElementById: id => scripts.find(s => s.id === id), createElement: () => ({}), body: { appendChild: s => scripts.push(s) } };
  const win = {};
  loadLiveChat(win, doc);
  loadLiveChat(win, doc);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, "https://embed.tawk.to/6ab052920dfa023441abcf65/1k30c5374");
  let visible = false;
  win.Tawk_API.showWidget = () => { visible = true; };
  win.Tawk_API.onLoad();
  assert.equal(visible, true);
  assert.equal(win.Tawk_API.onChatMinimized, undefined);
  assert.equal(win.Tawk_API.onChatMessageAgent, undefined);
  visible = false;
  loadLiveChat(win, doc);
  assert.equal(visible, true);
  assert.equal(scripts.length, 1);
});
