import { test } from "node:test";
import assert from "node:assert/strict";
import { captureChatAttribution, connectChatAttribution } from "../lib/chat-attribution.mjs";

function fixture(href = "https://www.jovamedia.com/?utm_source=instagram&utm_medium=social&utm_campaign=solo&utm_content=dm_a") {
  const commands = [], data = {};
  const crisp = {
    push(command) {
      commands.push(command);
      if (command[0] === "set") Object.assign(data, Object.fromEntries(command[2][0]));
    },
    get: (_type, key) => data[key],
  };
  const win = { location: { href }, $crisp: crisp };
  const doc = { referrer: "https://m.facebook.com/?private=secret#token" };
  const loaded = () => commands.find(c => c[0] === "on")[2]();
  return { win, doc, commands, data, loaded };
}

test("chat marketing data waits for both consent and session readiness", () => {
  const f = fixture();
  captureChatAttribution(f.win, f.doc, null);
  connectChatAttribution(f.win);
  f.loaded();
  assert.equal(f.commands.filter(c => c[0] === "set").length, 0);
  captureChatAttribution(f.win, f.doc, "accepted");
  assert.equal(f.data.marketing_first_source, "instagram");
  assert.equal(f.data.marketing_first_referrer, "m.facebook.com");
  assert.equal(f.data.marketing_latest_content, "dm_a");
  assert.equal(f.data.marketing_qa, false);
  assert.doesNotMatch(JSON.stringify(f.data), /secret|token|https:/);
});

test("withdrawal before SDK load prevents pending attribution from being sent", () => {
  const f = fixture();
  captureChatAttribution(f.win, f.doc, "accepted");
  connectChatAttribution(f.win);
  captureChatAttribution(f.win, f.doc, "rejected");
  f.loaded();
  assert.equal(f.commands.filter(c => c[0] === "set").length, 0);
});

test("navigation and reload preserve first touch and latest tagged campaign", () => {
  const f = fixture();
  captureChatAttribution(f.win, f.doc, "accepted");
  connectChatAttribution(f.win);
  connectChatAttribution(f.win);
  f.loaded();
  f.win.location.href = "https://www.jovamedia.com/industries/beauty-and-nails";
  captureChatAttribution(f.win, f.doc, "accepted");
  const count = f.commands.length;
  captureChatAttribution(f.win, f.doc, "accepted");
  assert.equal(f.commands.length, count);
  assert.equal(f.data.marketing_page, "/industries/beauty-and-nails");
  assert.equal(f.data.marketing_first_page, "/");
  f.win.location.href = "https://www.jovamedia.com/?utm_source=nextdoor&utm_content=dm_b";
  captureChatAttribution(f.win, f.doc, "accepted");
  assert.equal(f.data.marketing_first_source, "instagram");
  assert.equal(f.data.marketing_latest_source, "nextdoor");
  assert.equal(f.data.marketing_latest_campaign, "");
  const reloaded = { location: { href: "https://www.jovamedia.com/pricing" }, $crisp: f.win.$crisp };
  captureChatAttribution(reloaded, f.doc, "accepted");
  connectChatAttribution(reloaded);
  f.commands.filter(c => c[0] === "on").at(-1)[2]();
  assert.equal(f.data.marketing_first_page, "/");
  assert.equal(f.data.marketing_latest_source, "nextdoor");
  assert.ok(f.commands.every(c => c[0] !== "do"));
});

test("private paths and invalid campaign labels never enter chat context", () => {
  for (const path of ["/account/secret", "/preview/booking", "/industries/unknown"]) {
    const f = fixture(`https://www.jovamedia.com${path}?utm_source=email`);
    captureChatAttribution(f.win, f.doc, "accepted");
    connectChatAttribution(f.win); f.loaded();
    assert.deepEqual(f.data, {});
  }
  const f = fixture("https://www.jovamedia.com/?utm_source=private%40example.com&email=secret#auth-token");
  captureChatAttribution(f.win, f.doc, "accepted");
  connectChatAttribution(f.win); f.loaded();
  assert.equal(f.data.marketing_first_source, "");
  assert.doesNotMatch(JSON.stringify(f.data), /private|secret|auth-token/);
});

test("explicit QA campaign is labelled without guessing bots from location", () => {
  const f = fixture("https://www.jovamedia.com/?utm_source=campaign_qa&utm_medium=verification");
  captureChatAttribution(f.win, f.doc, "accepted");
  connectChatAttribution(f.win); f.loaded();
  assert.equal(f.data.marketing_qa, true);
  assert.doesNotMatch(JSON.stringify(f.data), /Springfield|bot|human/);
});
