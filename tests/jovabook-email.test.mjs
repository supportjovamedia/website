import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createBookingEmailHandlers,bookingEmailContent,verifyBookingEmailWebhook} from '../lib/jovabook-email.mjs';
const token='a'.repeat(64),time=Date.UTC(2026,9,31,16),secret='whsec_'+Buffer.from('a real webhook test signing key').toString('base64');
const env={JOVABOOK_EMAIL_WORKER_TOKEN:token,JOVABOOK_SUPABASE_URL:'https://example.supabase.co',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'public-test-key',RESEND_API_KEY:'private-test-only'};
const cfg={enabled:true,sender:'bookings@jovamedia.com',public_url:'https://book.jovamedia.com',webhook_secret:secret};
const fixture={id:'job-1',lease:'lease-1',recipient:'customer@example.test',payload:{business:'Example Studio',slug:'example-studio',reply_to:'owner@example.test',staff_name:'Sam',color:'#77504e',kind:'confirmed',audience:'customer',booking:{id:'bk_private',name:'Taylor',serviceName:'Consultation',date:'2026-11-20',time:'10:00',price:40}}};
const request=body=>new Request('https://www.jovamedia.com/api/jovabook/email/worker',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
function harness({jobs=[structuredClone(fixture)],providerStatus=200,providerData={id:'provider-1'},throwSend=false}={}){
 const calls=[],database=[],saved=[];
 const send=async(url,opts)=>{if(String(url).includes('supabase.co')){const b=JSON.parse(opts.body);database.push(b);assert.equal(b.p_token,token);assert.equal(opts.headers.apikey,env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY);
  let value;if(b.p_action==='config')value=cfg;else if(b.p_action==='health')value={enabled:true};else if(b.p_action==='claim')value=jobs;else if(b.p_action==='prepare'){value=b.p_payload.mail;saved.push(value);}else value={ok:true};return Response.json(value);}
  calls.push({url,opts});assert.equal(opts.headers.Authorization,'Bearer '+env.RESEND_API_KEY);if(throwSend)throw Error('network');return Response.json(providerData,{status:providerStatus});};
 return {calls,database,saved,handlers:createBookingEmailHandlers({env,send,now:()=>time,wait:async()=>{}})};
}
test('Booking emails escape content, keep business replies and separate owner/customer links',()=>{
 const j=structuredClone(fixture);j.payload.business='Studio\r\nBcc: other@example.test';j.payload.booking.name='<script>alert(1)</script>';j.payload.booking.serviceName='<img src=x onerror=alert(1)>';
 const mail=bookingEmailContent(j,cfg);assert(!mail.subject.includes('\n'));assert(!mail.html.includes('<script>'));assert(!mail.html.includes('<img src=x'));assert(mail.html.includes('&lt;img src=x'));assert.equal(mail.reply_to,'owner@example.test');assert(mail.text.includes('?salon=example-studio#manage/bk_private'));assert(mail.from.endsWith('<bookings@jovamedia.com>'));assert(!JSON.stringify(mail).includes('private-test-only'));
 j.payload.audience='owner';const owner=bookingEmailContent(j,cfg);assert(owner.text.includes('https://book.jovamedia.com/#bookings'));assert(!owner.text.includes('#manage/'));
});
test('Unauthorized requests and malformed bodies never touch the provider or database',async()=>{
 const h=harness();let r=await h.handlers.worker(new Request('https://www.jovamedia.com/api/jovabook/email/worker',{method:'POST',body:'{}'}));assert.equal(r.status,401);assert.equal(h.database.length,0);
 r=await h.handlers.worker(new Request(request({}),{body:'['}));assert.equal(r.status,400);assert.equal(h.calls.length,0);
});
test('Claimed jobs freeze exact content before sending and use a stable idempotency key',async()=>{
 const h=harness();const r=await h.handlers.worker(request({}));assert.equal(r.status,200);assert.equal((await r.json()).processed,1);assert.equal(h.calls[0].opts.headers['Idempotency-Key'],'jovabook-email/job-1');assert.deepEqual(JSON.parse(h.calls[0].opts.body),h.saved[0]);assert.equal(h.database.at(-1).p_action,'finish');assert.equal(h.database.at(-1).p_payload.provider_id,'provider-1');
});
test('Retries use the frozen provider request even if the current rendering changes',async()=>{
 const j=structuredClone(fixture);j.provider_payload={subject:'Frozen message',to:['customer@example.test']};const h=harness({jobs:[j]});await h.handlers.worker(request({}));assert.deepEqual(JSON.parse(h.calls[0].opts.body),j.provider_payload);
});
test('Timeouts and rate limits request a safe retry while permanent rejection fails visibly',async()=>{
 for(const opt of [{throwSend:true},{providerStatus:429,providerData:{}},{providerStatus:503,providerData:{}},{providerStatus:422,providerData:{}}]){const h=harness(opt);await h.handlers.worker(request({}));assert.equal(h.database.at(-1).p_payload.retry,opt.providerStatus!==422);assert(!JSON.stringify(h.database.at(-1)).includes('private-test-only'));}
});
test('Invalid or obsolete prepared jobs cannot reach Resend',async()=>{
 const h=harness({jobs:[{...structuredClone(fixture),recipient:'invalid'}]});await h.handlers.worker(request({}));assert.equal(h.calls.length,0);assert.equal(h.database.at(-1).p_payload.retry,false);
});
function signed(raw,at=String(time/1000),id='msg_test') {const signature=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(id+'.'+at+'.'+raw).digest('base64');return new Headers({'svix-id':id,'svix-timestamp':at,'svix-signature':'v1,'+signature});}
test('Webhook verification rejects changed payloads, wrong secrets and stale timestamps',()=>{
 const raw='{"test":true}',headers=signed(raw);assert(verifyBookingEmailWebhook(raw,headers,secret,time));assert(!verifyBookingEmailWebhook(raw+' ',headers,secret,time));assert(!verifyBookingEmailWebhook(raw,headers,'whsec_bad',time));assert(!verifyBookingEmailWebhook(raw,signed(raw,String(time/1000-301)),secret,time));
});
test('Only signed delivery callbacks update stored delivery events',async()=>{
 const h=harness(),raw=JSON.stringify({type:'email.delivered',created_at:new Date(time).toISOString(),data:{email_id:'provider-1'}});let r=await h.handlers.webhook(new Request('https://www.jovamedia.com/api/jovabook/email/webhook',{method:'POST',body:raw,headers:signed(raw)}));assert.equal(r.status,200);assert.equal(h.database.at(-1).p_payload.type,'email.delivered');const before=h.database.filter(x=>x.p_action==='event').length;
 r=await h.handlers.webhook(new Request('https://www.jovamedia.com/api/jovabook/email/webhook',{method:'POST',body:raw,headers:{}}));assert.equal(r.status,400);assert.equal(h.database.filter(x=>x.p_action==='event').length,before);
});
test('Live delivery self-test is restricted to official Resend simulator addresses',async()=>{
 const h=harness();const r=await h.handlers.worker(request({action:'self-test',recipient:'victim@example.test'}));assert.equal(r.status,200);assert.deepEqual(h.calls.map(c=>JSON.parse(c.opts.body).to[0]),['delivered+jovabook@resend.dev','bounced+jovabook@resend.dev']);assert(h.calls.every(c=>!c.opts.body.includes('victim@example.test')));
});
test('Setup repairs an existing disabled webhook and never returns its signing secret',async()=>{
 const calls=[];const send=async(url,opts)=>{
  if(String(url).includes('supabase.co')){const b=JSON.parse(opts.body);assert.equal(b.p_action,'webhook_config');assert.equal(b.p_payload.secret,secret);return Response.json({ok:true});}
  calls.push({url,opts});if(url.endsWith('/webhooks?limit=100'))return Response.json({data:[{id:'hook-1',endpoint:'https://www.jovamedia.com/api/jovabook/email/webhook'}]});
  if(opts.method==='PATCH'){const b=JSON.parse(opts.body);assert.equal(b.status,'enabled');assert(b.events.includes('email.delivered'));assert(b.events.includes('email.failed'));return Response.json({id:'hook-1'});}
  return Response.json({id:'hook-1',status:'disabled',events:['email.sent'],signing_secret:secret});
 };
 const r=await createBookingEmailHandlers({env,send}).worker(request({action:'setup'}));assert.equal(r.status,200);assert.equal(calls.filter(c=>c.opts.method==='PATCH').length,1);assert(!(await r.text()).includes(secret));
});
test('Setup reports provider permission failure without enabling delivery',async()=>{
 const actions=[];const send=async(url,opts)=>{actions.push({url,opts});return Response.json({message:'Forbidden'},{status:403});};
 const r=await createBookingEmailHandlers({env,send}).worker(request({action:'setup'}));assert.equal(r.status,502);assert.equal((await r.json()).provider_status,403);assert(!actions.some(a=>a.url.includes('supabase.co')));
});
