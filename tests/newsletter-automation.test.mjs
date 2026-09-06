import test from 'node:test';
import assert from 'node:assert/strict';
import { startNewsletterAutomation } from '../lib/newsletter-automation.mjs';
import { createGrowthHandler, seal } from '../lib/growth-delivery.mjs';
const env = { NEWSLETTER_AUTOMATION_ENABLED:'true', UPSTASH_REDIS_REST_URL:'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN:'test', RESEND_API_KEY:'test', RESEND_NEWSLETTER_SEGMENT_ID:'segment', RESOURCE_FROM_EMAIL:'hello@example.com', SITE_URL:'https://example.com', NEWSLETTER_TOKEN_SECRET:'x'.repeat(40) };
function fixture(eventStatus=200) {
  const records=new Map(); const events=[]; const contacts=[];
  const send=async (url,opts)=>{
    const body=opts.body ? JSON.parse(opts.body):null;
    if(url.startsWith(env.UPSTASH_REDIS_REST_URL)) {
      const [op,k,v,nx]=body;
      if(op==='GET')return Response.json({result:records.get(k)??null});
      if(op==='DEL'){records.delete(k);return Response.json({result:1});}
      if(nx==='NX'&&records.has(k))return Response.json({result:null});
      records.set(k,v);return Response.json({result:'OK'});
    }
    if(url.endsWith('/events/send')){events.push(body);if(eventStatus==='timeout')throw Error('timeout');return Response.json({id:'event'}, {status:eventStatus});}
    contacts.push([url,opts.method,body]);
    return Response.json({id:'contact',unsubscribed:false});
  };
  return {send,records,events,contacts};
}
const run=(f,overrides={})=>startNewsletterAutomation({env,send:f.send,email:'sam@example.com',contactId:'contact',...overrides});
test('concurrent requests and later instances emit one event',async()=>{
  const f=fixture();await Promise.allSettled([run(f),run(f)]);await run(f);
  assert.deepEqual(f.events,[{event:'newsletter.confirmed',contact_id:'contact'}]);
  assert.deepEqual([...f.records.values()],['sent']);
});
test('uncertain dispatch remains blocked rather than starting a duplicate',async()=>{
  const f=fixture('timeout');await assert.rejects(run(f));await assert.rejects(run(f));assert.equal(f.events.length,1);
});
test('explicit rejection releases claim for a corrected retry',async()=>{
  const f=fixture(403);await assert.rejects(run(f));assert.equal(f.records.size,0);await assert.rejects(run(f));assert.equal(f.events.length,2);
});
test('server failure retains claim',async()=>{
  const f=fixture(500);await assert.rejects(run(f));await assert.rejects(run(f));assert.equal(f.events.length,1);
});
test('disabled automation makes no calls; missing storage fails closed',async()=>{
  const f=fixture();await run(f,{env:{}});assert.equal(f.records.size,0);
  await assert.rejects(run(f,{env:{...env,UPSTASH_REDIS_REST_URL:''}}));assert.equal(f.events.length,0);
});
const request=data=>new Request('https://example.com/api/growth',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify(data)});
test('confirmation persists consent and segment before event; repeated confirmation is safe',async()=>{
  const f=fixture();const data={kind:'confirm',token:seal({purpose:'newsletter',email:'sam@example.com',expires:Date.now()+60000},env.NEWSLETTER_TOKEN_SECRET)};
  assert.equal((await createGrowthHandler({env,send:f.send})(request(data))).status,200);
  assert.equal(f.contacts[1][1],'PATCH');assert.match(f.contacts[2][0],/segments\/segment$/);
  assert.equal((await createGrowthHandler({env,send:f.send})(request(data))).status,200);assert.equal(f.events.length,1);
});
test('enabled automation still never runs for checklist or unconfirmed signup',async()=>{
  const f=fixture();for(const kind of ['checklist','newsletter'])assert.equal((await createGrowthHandler({env,send:f.send})(request({kind,email:'sam@example.com',name:'',website:''}))).status,200);
  assert.equal(f.events.length,0);assert.equal(f.records.size,0);
});
test('new contact dispatch uses the newly created contact ID',async()=>{
  const f=fixture();const send=(u,o)=>o.method==='GET'?Promise.resolve(Response.json({}, {status:404})):f.send(u,o);
  const token=seal({purpose:'newsletter',email:'sam@example.com',expires:Date.now()+60000},env.NEWSLETTER_TOKEN_SECRET);
  assert.equal((await createGrowthHandler({env,send})(request({kind:'confirm',token}))).status,200);
  assert.equal(f.events[0].contact_id,'contact');assert.equal(f.contacts[0][2].segments[0].id,'segment');
});
test('unsubscribed contact and rejected consent write never dispatch',async()=>{
  for(const unsubscribed of [true,false]){
    const f=fixture();const send=(u,o)=>o.method==='GET'?Promise.resolve(Response.json({id:'contact',unsubscribed})):Promise.resolve(Response.json({}, {status:500}));
    const token=seal({purpose:'newsletter',email:'sam@example.com',expires:Date.now()+60000},env.NEWSLETTER_TOKEN_SECRET);
    assert.equal((await createGrowthHandler({env,send})(request({kind:'confirm',token}))).status,unsubscribed?409:502);assert.equal(f.events.length,0);
  }
});
