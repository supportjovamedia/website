import {test} from "node:test";
import assert from "node:assert/strict";
import {createContactHandler} from "../lib/contact-delivery.mjs";
const env={RESEND_API_KEY:"test-key",CONTACT_FROM_EMAIL:"Website <hello@example.com>",CONTACT_TO_EMAIL:"inbox@example.com"};
const data={name:"Test Visitor",email:"test@example.com",company:"Company",service:"Websites",timing:"Soon",message:"Please help with our website.",website:""};
const req=(body=data,headers={})=>new Request("https://www.jovamedia.com/api/contact",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://www.jovamedia.com","Idempotency-Key":"12345678-1234-1234-1234-123456789abc",...headers},body:JSON.stringify(body)});
test("contact sends only to configured inbox, uses reply-to, and reuses provider key on retry",async()=>{
 const sent=[];const handler=createContactHandler({env,send:async(url,options)=>{sent.push({url,...options});return Response.json({id:"message-id"})}});
 assert.equal((await handler(req())).status,200);assert.equal((await handler(req())).status,200);
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
 for(let i=0;i<5;i++)assert.equal((await handler(req(data,{"Idempotency-Key":`12345678-1234-1234-1234-123456789ab${i}`}))).status,200);
 assert.equal((await handler(req(data,{"Idempotency-Key":"12345678-1234-1234-1234-123456789ab9"}))).status,429);
});
