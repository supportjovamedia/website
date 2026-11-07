import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrowthHandler, unseal } from '../lib/growth-delivery.mjs';
import { googleChecklistPath, googleGrowthConsentVersion } from '../lib/google-growth-resources.mjs';
const env={RESEND_API_KEY:'test',RESOURCE_FROM_EMAIL:'hello@example.com',SITE_URL:'https://example.com',NEWSLETTER_TOKEN_SECRET:'s'.repeat(40),RESEND_NEWSLETTER_SEGMENT_ID:'segment',NEWSLETTER_AUTOMATION_ENABLED:'true'};
const req=data=>new Request('https://example.com/api/growth',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify(data)});
test('Google guide signup confirms consent before adding a contact; new series never dispatches',async()=>{
  const calls=[];
  const handler=createGrowthHandler({env,send:async(url,opts)=>{calls.push({url,method:opts.method,body:opts.body?JSON.parse(opts.body):null});return opts.method==='GET'?Response.json({}, {status:404}):Response.json({id:'created'});}});
  assert.equal((await handler(req({kind:'newsletter',resource:'google-visibility',email:'reader@example.com',name:'',website:''}))).status,200);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  const mail=calls.find(c=>c.url.endsWith('/emails')).body;
  const token=mail.text.match(/\/newsletter\/confirm#([\w-]+)/)[1];
  assert.equal(unseal(token,env.NEWSLETTER_TOKEN_SECRET).resource,'google-visibility');
  assert.match(mail.text,/product updates/);
  const response=await handler(req({kind:'confirm',token}));
  assert.equal(response.status,200);assert.equal((await response.json()).resourceUrl,googleChecklistPath);
  const contact=calls.find(c=>c.url.endsWith('/contacts')&&c.method==='POST').body;
  assert.equal(contact.properties.newsletter_consent_version,googleGrowthConsentVersion);
  assert.equal(contact.segments[0].id,'segment');
  assert.ok(!calls.some(c=>c.url.includes('/events/send')));
});
test('resource selection cannot redirect the subscriber to arbitrary destinations',async()=>{
 const handler=createGrowthHandler({env,send:()=>assert.fail('Invalid resource must never contact Resend')});
 assert.equal((await handler(req({kind:'newsletter',resource:'https://untrusted.example',email:'a@example.com',name:'',website:''}))).status,400);
});
test('unsubscribed contacts stay suppressed for the new signup',async()=>{
 const calls=[];const handler=createGrowthHandler({env,send:async(url,options)=>{calls.push(options.method);return Response.json({id:'c',unsubscribed:true});}});
 assert.equal((await handler(req({kind:'newsletter',resource:'google-visibility',email:'a@example.com',name:'',website:''}))).status,409);
 assert.deepEqual(calls,['GET']);
});
