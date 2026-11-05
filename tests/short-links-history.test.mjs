import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanHistory, createStore, createOperatorLinksHandler} from '../lib/short-links.mjs';
const now=()=>new Date('2026-11-05T12:00:00Z');
const env={UPSTASH_REDIS_REST_URL:'https://redis.example.test',UPSTASH_REDIS_REST_TOKEN:'fixture',JOVABOOK_SUPABASE_URL:'https://db.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture'};
function fixture(){
 const hashes=new Map(),calls=[];
 const run=([op,key,...args])=>{
  if(op==='HGETALL')return [...(hashes.get(key)||new Map())].flat();
  if(op==='EXPIRE'){assert.equal(args[0],35*86400);return 1;}
  const hash=hashes.get(key)||new Map();hashes.set(key,hash);
  if(op==='HINCRBY'){hash.set(args[0],Number(hash.get(args[0])||0)+args[1]);return hash.get(args[0]);}
  if(op==='HSET'||op==='HSETNX'){if(op==='HSET'||!hash.has(args[0]))hash.set(args[0],args[1]);return 1;}
  throw Error('Unexpected command '+op);
 };
 const store=createStore({env,now,send:async(_url,options)=>{const commands=JSON.parse(options.body);calls.push(commands);return Response.json(commands.map(c=>({result:run(c)})));}});
 return {store,hashes,calls};
}
test('history validates real calendar dates, bounded range and safe exact link filters',()=>{
 assert.deepEqual(cleanHistory({},now()),{start:'2026-10-30',end:'2026-11-05',code:''});
 for(const value of [{start:'2026-02-30'},{start:'2026-10-06'},{end:'2026-11-06'},{start:'2026-11-05',end:'2026-11-04'},{code:'../private'},{extra:true},null])assert.throws(()=>cleanHistory(value,now()));
 assert.equal(cleanHistory({start:'2026-10-07',end:'2026-11-05',code:'nextdoor'},now()).code,'nextdoor');
});
test('daily records split at UK midnight, separate previews, keep repeat opens and filter by date/link',async()=>{
 const {store,calls}=fixture();
 await store.record({code:'instagram',bot:false,at:'2026-10-24T23:30:00Z'}); // 25 October in BST.
 await store.record({code:'instagram',bot:false,at:'2026-10-25T23:30:00Z'}); // Still 25 October in GMT.
 await store.record({code:'instagram',bot:true,at:'2026-10-25T23:40:00Z'});
 await store.record({code:'nextdoor',bot:false,at:'2026-11-04T20:00:00Z'});
 let data=await store.history({start:'2026-10-24',end:'2026-11-05'});
 assert.equal(data.available,true);assert.equal(data.tracking_started_at,'2026-10-24T23:30:00Z');
 assert.deepEqual(data.rows,[{day:'2026-11-04',code:'nextdoor',clicks:1,bots:0,last:'2026-11-04T20:00:00Z'},{day:'2026-10-25',code:'instagram',clicks:2,bots:1,last:'2026-10-25T23:30:00Z'}]);
 data=await store.history({start:'2026-10-25',end:'2026-10-25',code:'instagram'});assert.equal(data.rows.length,1);assert.equal(data.rows[0].clicks,2);
 assert.deepEqual((await store.history({start:'2026-11-05',end:'2026-11-05'})).rows,[]);
 assert(calls.flat().filter(c=>c[0]==='EXPIRE').length===4);
 assert.doesNotMatch(JSON.stringify(calls),/ZADD|LPUSH|fingerprint|session|user.agent|192\.0\.2|Mozilla/i);
});
test('legacy totals are not invented as daily history, and unavailable/malformed storage is not zero',async()=>{
 const {store,hashes}=fixture();hashes.set('shortlink:v2:totals:instagram',new Map([['clicks',99]]));
 assert.deepEqual((await store.history()).rows,[]);assert.equal((await store.history()).tracking_started_at,null);
 await store.record({code:'nextdoor',bot:false,at:'2026-11-05T10:00:00Z'});
 hashes.get('shortlink:v4:history:2026-11-05').set('nextdoor:clicks','bad');assert.equal((await store.history()).available,false);
 const offline=createStore({env,now,send:async()=>{throw Error('offline');}});assert.equal((await offline.history()).available,false);
});
test('only verified operators can read history and unsafe filters never reach storage',async()=>{
 let reads=0;const store={history:async filters=>{reads++;return {available:true,...filters,rows:[],tracking_started_at:null};}};
 const call=filters=>new Request('https://www.jovamedia.com/api/jovabook/operator/links',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({action:'history',filters})});
 for(const role of ['business','customer','unassigned'])assert.equal((await createOperatorLinksHandler({env,store,now,send:async()=>Response.json({ok:true,role})})(call({}))).status,403);
 assert.equal(reads,0);
 const handler=createOperatorLinksHandler({env,store,now,send:async()=>Response.json({ok:true,role:'operator'})});
 assert.equal((await handler(call({start:'2026-01-01'}))).status,400);assert.equal(reads,0);
 const response=await handler(call({code:'nextdoor'}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).history.code,'nextdoor');assert.equal(reads,1);
});
