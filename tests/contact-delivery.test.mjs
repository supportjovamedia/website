import {test} from "node:test";
import assert from "node:assert/strict";
import {createContactHandler as createHandler} from "../lib/contact-delivery.mjs";
const env={RESEND_API_KEY:"test-key",CONTACT_FROM_EMAIL:"Website <hello@example.com>",CONTACT_TO_EMAIL:"inbox@example.com",RECAPTCHA_SECRET_KEY:"private-captcha-key"};
const createContactHandler=options=>createHandler({verifyFetch:async()=>Response.json({success:true,hostname:"www.jovamedia.com"}),...options});
const data={name:"Test Visitor",email:"test@example.com",company:"Company",country:"GB",budget:"£201–£500",service:"Website Development",timing:"Soon",message:"Please help with our website. We run a local business and need a clear, mobile-friendly site that explains our services and encourages enquiries.",website:"",recaptchaToken:"fresh-captcha-token"};
const req=(body=data,headers={})=>new Request("https://www.jovamedia.com/api/contact",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://www.jovamedia.com","Idempotency-Key":"12345678-1234-1234-1234-123456789abc",...headers},body:JSON.stringify(body)});
test("contact sends only to configured inbox, uses reply-to, and reuses provider key on retry",async()=>{
 const sent=[];const handler=createContactHandler({env,send:async(url,options)=>{sent.push({url,...options});return Response.json({id:"message-id"})}});
 assert.equal((await handler(req())).status,200);assert.equal((await handler(req({...data,recaptchaToken:"fresh-retry-token"}))).status,200);
 const mail=JSON.parse(sent[0].body);assert.deepEqual(mail.to,["inbox@example.com"]);assert.equal(mail.reply_to,data.email);assert.match(mail.text,/Please help/);assert.equal(sent[0].headers["Idempotency-Key"],sent[1].headers["Idempotency-Key"]);
});
test("contact never claims success on missing config, provider rejection, missing receipt or timeout",async()=>{
 assert.equal((await createContactHandler({env:{}})(req())).status,503);
 for(const send of [async()=>Response.json({error:"invalid"},{status:403}),async()=>Response.json({}),async()=>{throw Error("timeout")}])assert.equal((await createContactHandler({env,send})(req())).status,502);
});
test("contact rejects invalid data, unwanted origins, oversized payloads and honeypot",async()=>{
 const handler=createContactHandler({env,send:async()=>{throw Error("Must not send")}});
 for(const body of [{...data,email:"bad"},{...data,name:"a\nb"},{...data,message:"short"},{...data,website:"spam"}])assert.equal((await handler(req(body))).status,400);
 assert.equal((await handler(req(data,{Origin:"https://attacker.example"}))).status,403);
 assert.equal((await handler(req({...data,message:"x".repeat(17000)}))).status,413);
});
test("contact limits repeated new requests",async()=>{
 const handler=createContactHandler({env,send:async()=>Response.json({id:"accepted"})});
 for(let i=0;i<5;i++)assert.equal((await handler(req({...data,recaptchaToken:`fresh-token-${i}`},{"Idempotency-Key":`12345678-1234-1234-1234-123456789ab${i}`}))).status,200);
 assert.equal((await handler(req(data,{"Idempotency-Key":"12345678-1234-1234-1234-123456789ab9"}))).status,429);
});

test("contact enforces qualification fields and trimmed description minimums before sending", async () => {
 const handler=createContactHandler({env,send:async()=>{assert.fail("Invalid enquiries must not reach email delivery")}});
 for (const change of [{name:"   "},{country:""},{country:"ZZ"},{budget:""},{budget:"£1"},{service:"A connected programme"},{message:"x".repeat(99)},{message:" ".repeat(100)},{service:"Other",other:"short"},{service:"Other",other:"          "}]) {
   const response=await handler(req({...data,...change}));
   assert.equal(response.status,400,JSON.stringify(change));
   assert.ok(Object.keys((await response.json()).fields).length);
 }
});

test("country, budget and Other details reach the inbox; optional fields can be omitted", async () => {
 let mail;
 const handler=createContactHandler({env,send:async(url,options)=>{mail=JSON.parse(options.body);return Response.json({id:"accepted"})}});
 assert.equal((await handler(req({...data,country:"US",service:"Other",other:"A customer booking system",company:undefined,timing:undefined,message:"x".repeat(100)}))).status,200);
 assert.match(mail.text,/Country: United States/);
 assert.match(mail.text,/Budget \(GBP\): £201–£500/);
 assert.doesNotMatch(mail.text,/monthly budget/i);
 assert.match(mail.text,/Other: A customer booking system/);
 assert.match(mail.text,/Company: Not provided/);
});


test("general questions and client support can send without project qualification", async () => {
 for (const service of ["General enquiry", "Existing client support"]) {
  let mail;
  const handler=createContactHandler({env,send:async(url,options)=>{mail=JSON.parse(options.body);return Response.json({id:"accepted"})}});
  const body={name:"Test Visitor",email:"test@example.com",service,message:"Could you help me with my existing website?",website:"",recaptchaToken:"fresh-captcha-token"};
  assert.equal((await handler(req(body))).status,200);
  assert.ok(mail.text.includes(service));
  assert.doesNotMatch(mail.text,/undefined/);
  assert.equal((await handler(req({...body,message:"short"}))).status,400);
 }
});

test("contact requires real production CAPTCHA configuration before any external request", async () => {
 const mustNotFetch=async()=>assert.fail("Unavailable configuration must not make external requests");
 for(const configuration of [
  {...env,RECAPTCHA_SECRET_KEY:undefined},
  {...env,RECAPTCHA_SECRET_KEY:"   "},
  {...env,VERCEL_ENV:"production",RECAPTCHA_SECRET_KEY:"6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"},
 ]) {
  const handler=createContactHandler({env:configuration,verifyFetch:mustNotFetch,send:mustNotFetch});
  assert.equal((await handler(req())).status,503);
 }
});

test("missing, invalid, expired, duplicate or wrong-host CAPTCHA never reaches email delivery", async () => {
 const send=async()=>assert.fail("Rejected CAPTCHA must not reach Resend");
 for(const token of [undefined,null,"","   ",123,{},"x".repeat(4097)]) {
  const handler=createContactHandler({env,send,verifyFetch:async()=>assert.fail("Invalid tokens must not reach Google")});
  assert.equal((await handler(req({...data,recaptchaToken:token}))).status,400);
 }
 for(const verification of [
  {success:false,"error-codes":["invalid-input-response"]},
  {success:false,"error-codes":["timeout-or-duplicate"]},
  {success:true,hostname:"attacker.example"},
 ]) {
  const handler=createContactHandler({env,send,verifyFetch:async()=>Response.json(verification)});
  assert.equal((await handler(req())).status,400);
 }
});

test("verification outages fail closed without sending email", async () => {
 for(const verifyFetch of [
  async()=>Response.json({},{status:503}),
  async()=>new Response("not JSON"),
  async()=>{throw new DOMException("Timed out","TimeoutError")},
 ]) {
  const handler=createContactHandler({env,verifyFetch,send:async()=>assert.fail("No email without verification")});
  const response=await handler(req());
  assert.equal(response.status,503);
  assert.equal((await response.json()).ok,false);
 }
});

test("fresh CAPTCHA retries verify before delivery and preserve email idempotency after uncertain receipt", async () => {
 const order=[];
 const emails=[];
 const verifiedTokens=new Set();
 const handler=createContactHandler({env,
  verifyFetch:async(url,options)=>{
   const token=new URLSearchParams(options.body).get("response");
   order.push(`verify:${token}`);
   if(verifiedTokens.has(token))return Response.json({success:false,"error-codes":["timeout-or-duplicate"]});
   verifiedTokens.add(token);
   return Response.json({success:true,hostname:"jovamedia.com"});
  },
  send:async(url,options)=>{
   order.push("send");
   emails.push(options);
   if(emails.length===1)throw Error("Receipt connection lost");
   return Response.json({id:"same-message-id"});
  },
 });
 assert.equal((await handler(req({...data,recaptchaToken:"first-token"}))).status,502);
 assert.equal((await handler(req({...data,recaptchaToken:"first-token"}))).status,400);
 assert.equal((await handler(req({...data,recaptchaToken:"fresh-token"}))).status,200);
 assert.deepEqual(order,["verify:first-token","send","verify:first-token","verify:fresh-token","send"]);
 assert.equal(emails[0].headers["Idempotency-Key"],emails[1].headers["Idempotency-Key"]);
 assert.equal(emails[0].body,emails[1].body);
 assert.doesNotMatch(emails[0].body,/first-token|fresh-token|private-captcha-key/);
});
