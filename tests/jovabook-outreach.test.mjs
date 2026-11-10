import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {OUTREACH_TEMPLATES,outreachEmail,createOperatorOutreachHandler} from '../lib/jovabook-outreach.mjs';

const env={JOVABOOK_SUPABASE_URL:'https://db.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'pk',RESEND_API_KEY:'re_test'};
const uid='20000000-0000-4000-8000-000000000001';
const req=(body,headers={})=>new Request('https://www.jovamedia.com/api/jovabook/operator/outreach',{method:'POST',headers:{authorization:'Bearer abc.def',origin:'https://book.jovamedia.com',...headers},body:JSON.stringify(body)});
function fake({role='operator',prepared={ok:true,id:'30000000-0000-4000-8000-000000000001',email:'person@example.test',first_name:'Sam'},resend=true}={}){
  const calls=[];
  const send=async(url,init)=>{
    calls.push({url:String(url),init});
    const u=String(url),json=(b,s=200)=>new Response(JSON.stringify(b),{status:s});
    if(u.endsWith('portal_identity'))return json({ok:true,role});
    if(u.endsWith('operator_outreach_prepare'))return json(prepared);
    if(u.endsWith('operator_outreach_finish'))return json({ok:true});
    if(u==='https://api.resend.com/emails')return resend?json({id:'em_1'}):json({},500);
    throw Error('unexpected '+u);
  };
  return {calls,handler:createOperatorOutreachHandler({env,send})};
}

test('all three templates render subject, text and an escaped html body',()=>{
  assert.deepEqual(Object.keys(OUTREACH_TEMPLATES),['verify_email','come_back','finish_setup']);
  for(const key of Object.keys(OUTREACH_TEMPLATES)){
    const mail=outreachEmail(key,{firstName:'<b>Sam</b>'});
    assert.ok(mail.subject&&mail.text.includes('https://book.jovamedia.com'));
    assert.ok(!mail.html.includes('<b>Sam'));
    assert.ok(!mail.html.includes('<b>')&&!mail.text.includes('<'));
  }
  assert.match(outreachEmail('come_back').text,/Hi there,/);
  assert.throws(()=>outreachEmail('unknown'));
});

test('sends one email to the address the database returns, never one from the browser',async()=>{
  const {handler,calls}=fake();
  const res=await handler(req({user_id:uid,template:'finish_setup'}));
  assert.equal(res.status,200);
  const mail=calls.find(c=>c.url==='https://api.resend.com/emails'),payload=JSON.parse(mail.init.body);
  assert.deepEqual(payload.to,['person@example.test']);
  assert.equal(mail.init.headers['Idempotency-Key'],'operator-outreach-30000000-0000-4000-8000-000000000001');
  assert.equal(JSON.parse(calls.find(c=>c.url.endsWith('operator_outreach_finish')).init.body).p_status,'sent');
  assert.equal((await handler(req({user_id:uid,template:'finish_setup',email:'x@example.test'}))).status,400);
});

test('rejects non-operators, bad input and ineligible accounts without sending',async()=>{
  let f=fake({role:'owner'});assert.equal((await f.handler(req({user_id:uid,template:'come_back'}))).status,403);assert.ok(!f.calls.some(c=>c.url.includes('resend')));
  f=fake();assert.equal((await f.handler(req({user_id:'nope',template:'come_back'}))).status,400);
  assert.equal((await f.handler(req({user_id:uid,template:'spam'}))).status,400);
  assert.equal((await f.handler(req({user_id:uid,template:'come_back'},{authorization:''}))).status,401);
  assert.equal((await f.handler(req({user_id:uid,template:'come_back'},{origin:'https://evil.test'}))).status,403);
  f=fake({prepared:{ok:false,message:'This person was emailed in the last 3 days.'}});
  const res=await f.handler(req({user_id:uid,template:'come_back'}));
  assert.equal(res.status,409);assert.ok(!f.calls.some(c=>c.url.includes('resend')));
});

test('a provider failure is recorded as failed and reported without claiming it sent',async()=>{
  const {handler,calls}=fake({resend:false});
  const res=await handler(req({user_id:uid,template:'verify_email'}));
  assert.equal(res.status,502);assert.equal((await res.json()).ok,false);
  assert.equal(JSON.parse(calls.find(c=>c.url.endsWith('operator_outreach_finish')).init.body).p_status,'failed');
});

test('back office flags a mistyped duplicate and only offers sensible templates',async()=>{
  const ctx={window:{},Date,Math,Number,String,Boolean,Array,Object,Map,Intl};vm.createContext(ctx);
  vm.runInContext(await readFile(new URL('../booking-demo/operator-signup-flow.js',import.meta.url),'utf8'),ctx);
  const f=ctx.window.JovaOperatorSignupFlow,now=Date.parse('2026-11-10T23:00:00Z');
  const typo={id:'t',email:'azmahammath2@gmail.com',created_at:'2026-11-10T22:42:00Z',verified_at:null};
  const real={id:'r',email:'azmathammath2@gmail.com',created_at:'2026-11-10T22:43:00Z',verified_at:'2026-11-10T22:43:44Z',business_id:'b'};
  const other={id:'o',email:'someoneelse@gmail.com',created_at:'2026-11-10T22:44:00Z',verified_at:null};
  const map=f.typoMatches([typo,real,other]);
  assert.equal(map.get('t')?.id,'r');assert.ok(!map.has('o'));
  assert.equal(JSON.stringify(f.eligibleTemplates(typo,map.get('t'),now)),JSON.stringify([]));
  assert.equal(JSON.stringify(f.eligibleTemplates(other,undefined,now)),JSON.stringify(['verify_email']));
  assert.equal(JSON.stringify(f.eligibleTemplates({verified_at:'2026-11-01T00:00:00Z',created_at:'2026-11-01T00:00:00Z'},undefined,now)),JSON.stringify(['come_back','finish_setup']));
  assert.equal(JSON.stringify(f.eligibleTemplates({verified_at:'2026-11-10T00:00:00Z',created_at:'2026-11-10T00:00:00Z',business_id:'b',last_sign_in_at:'2026-11-10T20:00:00Z'},undefined,now)),JSON.stringify([]));
  const week=Date.parse('2026-11-20T00:00:00Z');
  assert.equal(f.nudgeMatch(other,undefined,'unverified',week),true);
  assert.equal(f.nudgeMatch(typo,map.get('t'),'unverified',week),false);
  assert.equal(f.nudgeMatch({verified_at:'2026-11-01T00:00:00Z',created_at:'2026-11-01T00:00:00Z'},undefined,'nosetup',week),true);
  assert.equal(f.nudgeMatch({verified_at:'2026-11-01T00:00:00Z',created_at:'2026-11-01T00:00:00Z',last_sign_in_at:'2026-11-18T00:00:00Z'},undefined,'inactive',week),false);
  assert.equal(f.nudgeMatch({verified_at:'2026-11-01T00:00:00Z',created_at:'2026-11-01T00:00:00Z',last_sign_in_at:'2026-11-10T00:00:00Z'},undefined,'inactive',week),true);
});
