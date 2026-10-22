import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_KEY, CONSENT_MAX_AGE, readConsent, browserConsent, publicPage, measurementUrl, replaySafeUrl, eventPayload, trackEvent, revokeTracking, campaignAttribution } from "../lib/marketing-analytics.mjs";

test("consent fails closed for corrupt, expired, future and unavailable storage", () => {
  const now = Date.now();
  for (const value of [null, "broken", JSON.stringify({choice:"accepted",time:now-CONSENT_MAX_AGE}), JSON.stringify({choice:"accepted",time:now+1}), JSON.stringify({choice:"accepted",time:"today"})]) assert.equal(readConsent({getItem:()=>value},now),null);
  assert.equal(readConsent({getItem(){throw Error("blocked");}},now),null);
  assert.equal(readConsent({getItem:()=>JSON.stringify({choice:"accepted",time:now})},now),"accepted");
  assert.equal(readConsent({getItem:key=>key==="jovamedia-consent-v1"?JSON.stringify({choice:"accepted",time:now}):null},now),null);
});

test("booking, account, confirmation, previews and arbitrary paths are excluded", () => {
  for (const path of ["/preview/booking","/preview/booking/account","/previews/sumera/index.html","/newsletter/confirm","/api/contact","/unknown","/contact/private"]) assert.equal(publicPage(path),false,path);
  for (const path of ["/","/contact","/about","/services","/services/seo","/privacy-policy","/blog","/share/jovamedia-2026"]) assert.equal(publicPage(path),true,path);
});

test("only bounded campaign labels survive URL cleaning", () => {
  assert.equal(measurementUrl("https://www.jovamedia.com/contact?email=private%40example.com&utm_source=nextdoor&utm_campaign=autumn#secret"),"https://www.jovamedia.com/contact?utm_source=nextdoor&utm_campaign=autumn");
  assert.equal(measurementUrl("https://www.jovamedia.com/?utm_source=private%40example.com"),"https://www.jovamedia.com/");
  assert.equal(replaySafeUrl("https://www.jovamedia.com/contact?email=private"),false);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/#private-token"),false);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/?utm_source=nextdoor"),true);
});

test("event allowlist discards arbitrary names, enquiry fields and contact targets", () => {
  const href="https://www.jovamedia.com/contact?email=private#token";
  assert.equal(eventPayload("email_address",{},href),null);
  assert.equal(eventPayload("page_view",{},"https://www.jovamedia.com/preview/booking"),null);
  assert.deepEqual(eventPayload("generate_lead",{form_id:"contact_enquiry",name:"Private",email:"private@example.com",message:"secret",destination:"mailto:private@example.com"},href),{page_path:"/contact",page_location:"https://www.jovamedia.com/contact",form_id:"contact_enquiry"});
});

test("website marketing pages and bounded enquiry selections remain measurable without admitting account paths or private values", () => {
  for (const path of ["/websites", "/websites/crm-systems", "/websites/customer-portals", "/websites/booking-systems"]) {
    assert.equal(publicPage(path), true);
    assert.equal(eventPayload("page_view", {}, `https://www.jovamedia.com${path}`).page_path, path);
  }
  for (const path of ["/websites/unknown", "/websites/customer-portals/account", "/websites/crm-systems/private"]) assert.equal(publicPage(path), false);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/websites#business-systems"), true);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/websites/crm-systems#scope"), true);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/get-a-quote?website=booking-systems&product=booking-system"), true);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/get-a-quote?website=private%40example.com"), false);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/websites?website=crm-systems"), false);
  assert.equal(measurementUrl("https://www.jovamedia.com/get-a-quote?website=crm-systems&email=private%40example.com#private"), "https://www.jovamedia.com/get-a-quote");
});

test("consultation and ecommerce events contain only curated fields, never session or customer details", () => {
  const payload=eventPayload("begin_checkout",{product_ids:["landing-page"],value:550,email:"private@example.com",session_id:"cs_private",card:"1234"},"https://www.jovamedia.com/basket?checkout=cancelled");
  assert.equal(payload.currency,"GBP");assert.equal(payload.items[0].item_id,"landing-page");
  assert.doesNotMatch(JSON.stringify(payload),/private|1234|cancelled/);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/checkout/complete"),false);
  assert.equal(eventPayload("purchase",{transaction_id:"cs_private",value:550,product_ids:["landing-page"]},"https://www.jovamedia.com/checkout/complete"),null);
  const purchase=eventPayload("purchase",{transaction_id:"JV-ABCDEF0123456789",value:550,product_ids:["landing-page"]},"https://www.jovamedia.com/checkout/complete?session_id=cs_private");
  assert.equal(purchase.transaction_id,"JV-ABCDEF0123456789");assert.doesNotMatch(JSON.stringify(purchase),/cs_private/);
  assert.equal(eventPayload("generate_lead",{form_id:"website_consultation",message:"private"},"https://www.jovamedia.com/consultation").form_id,"website_consultation");
});

test("nothing is queued before consent; accepted events reach all configured destinations", () => {
  const sent=[]; let choice="rejected";
  globalThis.window={location:{href:"https://www.jovamedia.com/contact"},localStorage:{getItem:key=>key===CONSENT_KEY?JSON.stringify({choice,time:Date.now()}):null},__jovaAnalytics:{ga:true,clarity:true},dataLayer:[],gtag:(...args)=>sent.push(args),clarity:(...args)=>sent.push(args)};
  try {
    trackEvent("generate_lead",{form_id:"contact_enquiry"}); assert.equal(sent.length,0); assert.equal(window.dataLayer.length,0);
    choice="accepted"; trackEvent("generate_lead",{form_id:"contact_enquiry",email:"secret"});
    assert.equal(sent[0][0],"event"); assert.equal(sent[0][1],"generate_lead"); assert.equal(sent[0][2].email,undefined);
    assert.deepEqual(sent[1],["event","generate_lead"]); assert.equal(window.dataLayer[0].event,"jova_generate_lead");
    assert.ok(sent.some(args=>args[0]==="event" && args[1]==="generate_lead_contact_enquiry"));
    const sentCount=sent.length;
    choice="rejected"; trackEvent("page_view"); assert.equal(sent.length,sentCount);
  } finally { delete globalThis.window; }
});

test("campaign attribution survives internal navigation and rejects stored arbitrary data",()=>{
  let saved=null;const storage={getItem:()=>saved,setItem:(key,value)=>{saved=value;}};
  const campaign=campaignAttribution("https://www.jovamedia.com/?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=post_01&email=private",storage);
  assert.deepEqual(campaign,{campaign_source:"reddit",campaign_medium:"social",campaign_campaign:"launch",campaign_content:"post_01"});
  assert.deepEqual(campaignAttribution("https://www.jovamedia.com/get-a-quote",storage),campaign);
  saved=JSON.stringify({email:"private",campaign_source:"private@example.com",campaign_medium:"social"});
  assert.deepEqual(campaignAttribution("https://www.jovamedia.com/",storage),{campaign_medium:"social"});
  assert.doesNotThrow(()=>campaignAttribution("https://www.jovamedia.com/",{getItem(){throw Error();}}));
});

test("form funnel details are bounded and quote product links remain replay safe",()=>{
  const payload=eventPayload("form_validation_error",{form_id:"quote_callback",field_name:"email",error_stage:"validation",email:"secret",value:"secret",campaign_source:"facebook"},"https://www.jovamedia.com/get-a-quote?product=landing-page");
  assert.equal(payload.field_name,"email");assert.equal(payload.error_stage,"validation");assert.equal(payload.campaign_source,"facebook");
  assert.doesNotMatch(JSON.stringify(payload),/secret/);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/get-a-quote?product=landing-page&utm_source=facebook"),true);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/get-a-quote?product=private@example.com"),false);
  assert.equal(replaySafeUrl("https://www.jovamedia.com/contact?product=landing-page"),false);
});

test("blocked localStorage access cannot enable tracking or crash consent reads", () => {
  globalThis.window={get localStorage(){throw Error("blocked");},__jovaAnalytics:{ga:true}};
  try { assert.equal(browserConsent(),null); assert.doesNotThrow(()=>trackEvent("page_view")); } finally { delete globalThis.window; }
});

test("withdrawal disables GA, denies Clarity and clears only analytics cookies", () => {
  const calls=[],writes=[];
  globalThis.window={location:{hostname:"www.jovamedia.com"},__jovaAnalytics:{gaId:"G-TEST"},gtag:(...x)=>calls.push(x),clarity:(...x)=>calls.push(x)};
  globalThis.document={get cookie(){return "_ga=1; _ga_TEST=2; _clck=3; booking_access=private";},set cookie(value){writes.push(value);}};
  try {
    revokeTracking(); assert.equal(window["ga-disable-G-TEST"],true); assert.equal(window.__jovaAnalytics,null);
    assert.equal(calls[0][2].analytics_storage,"denied"); assert.equal(calls[1][1].analytics_Storage,"denied");
    assert(writes.some(x=>x.startsWith("_clck="))); assert(!writes.some(x=>x.startsWith("booking_access=")));
  } finally { delete globalThis.window; delete globalThis.document; }
});
