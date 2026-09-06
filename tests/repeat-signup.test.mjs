import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrowthHandler} from '../lib/growth-delivery.mjs';
const env={RESEND_API_KEY:'test',RESOURCE_FROM_EMAIL:'hello@example.com',SITE_URL:'https://example.com',NEWSLETTER_TOKEN_SECRET:'x'.repeat(40),RESEND_NEWSLETTER_SEGMENT_ID:'segment'};
const request=()=>new Request('https://example.com/api/growth',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({kind:'newsletter',email:'SAM@example.com',name:'',website:''})});
for(const [name,contact,status,expected,sends] of [
 ['confirmed',{id:'c',unsubscribed:false,properties:{newsletter_consent_at:{value:'2026-09-01'},newsletter_consent_version:{value:'footer-v1'}}},200,200,0],
 ['unsubscribed',{id:'c',unsubscribed:true},200,409,0],
 ['unconfirmed',{id:'c',unsubscribed:false},200,200,1],
 ['new',{},404,200,1],
 ['lookup failure',{},500,502,0],
])test(name+' subscriber handling',async()=>{
 let sent=0;
 const handler=createGrowthHandler({env,send:async(url,opts)=>{
  if(opts.method==='GET'){assert.match(url,/sam%40example.com$/);return Response.json(contact,{status});}
  sent++;assert.match(url,/\/emails$/);return Response.json({id:'email'});
 }});
 const response=await handler(request());assert.equal(response.status,expected);assert.equal(sent,sends);
 if(name==='confirmed')assert.equal((await response.json()).status,'already_subscribed');
});
