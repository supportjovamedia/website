import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
import {createPureSmsAdapter} from '../lib/jovabook-sms.mjs';

test('sms_phone supports the four launch markets and rejects other destinations',async()=>{
 const db=new PGlite();
 try{
  await bootstrap(db,await sources());
  const f=async v=>(await db.query('select jovabook_private.sms_phone($1) v',[v])).rows[0].v;
  assert.equal(await f('07700 900123'),'447700900123');assert.equal(await f('+44 7700 900123'),'447700900123');
  assert.equal(await f('+1 (415) 555-2671'),'14155552671');
  assert.equal(await f('+1 (416) 555-2671'),'14165552671');assert.equal(await f('+61 412 345 678'),'61412345678');
  for(const bad of ['4155552671','+1 115 555 2671','+1 415 155 2671','+1415555267','+1 242 555 2671','+1 787 555 2671','+1 876 555 2671','+91 98765 43210','+92 300 1234567','','abc'])assert.equal(await f(bad),null,bad);
 }finally{await db.close();}
});

test('PureSMS adapter sends once with the API key, picks sender per country and never retries unknown results',async()=>{
 const salon_id='20000000-0000-4000-8000-000000000001';
 const calls=[];const adapter=reply=>createPureSmsAdapter({apiKey:'key_fixture',ukSender:'JovaBook',usSender:'+18885550100',approvedCountries:['GB','US'],send:async(url,init)=>{calls.push({url,init});return reply;}});
 const ok=()=>new Response(JSON.stringify({id:'msg_1'}),{status:200});
 let a=adapter(ok());
 assert.deepEqual(await a.sendMessage({destination:'447700900123',salon_id,content:'Hi',sender:'Salon'}),{state:'Sent',provider_id:'msg_1',provider_status:'SENT'});
 assert.equal(calls[0].url,'https://connect-api.divergent.cloud/sms/send');assert.equal(calls[0].init.headers['X-Api-Key'],'key_fixture');
 assert.deepEqual(JSON.parse(calls[0].init.body),{sender:'JovaBook',recipient:'+447700900123',content:'Hi',clientTag:'jovabook-'+salon_id,kind:'Transactional',enableLinkShortening:false});
 await a.sendMessage({destination:'14155552671',salon_id,content:'Hi',sender:'Salon'});
 assert.equal(JSON.parse(calls[1].init.body).sender,'+18885550100');assert.equal(JSON.parse(calls[1].init.body).recipient,'+14155552671');
 assert.equal((await adapter(new Response('{}',{status:400})).sendMessage({destination:'447700900123',salon_id,content:'Hi',sender:'Salon'})).state,'Failed');
 assert.equal((await adapter(new Response('{}',{status:503})).sendMessage({destination:'447700900123',salon_id,content:'Hi',sender:'Salon'})).state,'Unknown');
 assert.equal((await adapter(ok()).sendMessage({destination:'919876543210',content:'Hi',sender:'Salon'})).state,'Failed');
 assert.equal((await createPureSmsAdapter({send:async()=>ok()}).sendMessage({destination:'447700900123',content:'Hi',sender:'Salon'})).state,'Failed');
 assert.equal(await a.balance(),null);assert.equal(await a.delivery('msg_1','447700900123'),null);
});
