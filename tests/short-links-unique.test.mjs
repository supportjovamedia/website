import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,createRedirectHandler,dailyLinkIdentity,linkDay} from '../lib/short-links.mjs';
const env={VERCEL:'1',UPSTASH_REDIS_REST_URL:'https://redis.example.test',UPSTASH_REDIS_REST_TOKEN:'fixture-unique-secret'};
const at=new Date('2026-11-03T12:00:00Z');
const request=(headers={})=>new Request('https://www.jovamedia.com/go/instagram',{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0','x-vercel-forwarded-for':'192.0.2.1',...headers}});
test('identities deduplicate daily per link, normalize IPv6, and retain neither raw address nor browser version',()=>{
 const a=dailyLinkIdentity(request(),'instagram',env,at);assert.match(a.digest,/^[a-f0-9]{64}$/);assert.equal(a.day,'2026-11-03');assert.equal(a.digest,dailyLinkIdentity(request({'user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/132.0'}),'instagram',env,at).digest);
 for(const [req,code,date] of [[request({'x-vercel-forwarded-for':'192.0.2.2'}),'instagram',at],[request(),'nextdoor',at],[request(),'instagram',new Date('2026-11-04T12:00:00Z')]])assert.notEqual(a.digest,dailyLinkIdentity(req,code,env,date).digest);
 assert.equal(dailyLinkIdentity(request({'x-vercel-forwarded-for':'2001:0db8:0:0:0:0:0:1'}),'instagram',env,at).digest,dailyLinkIdentity(request({'x-vercel-forwarded-for':'2001:db8::1'}),'instagram',env,at).digest);
 assert.equal(linkDay(new Date('2026-06-01T23:30:00Z')),'2026-06-02');assert.equal(linkDay(new Date('2026-11-03T23:30:00Z')),'2026-11-03');assert(!JSON.stringify(a).includes('192.0.2.1'));assert(!JSON.stringify(a).includes('Chrome'));
});
test('untrusted deployments, missing trusted addresses, bots and prefetches do not create unique identifiers',()=>{
 assert.equal(dailyLinkIdentity(request(),'instagram',{...env,VERCEL:'0'},at),null);
 for(const headers of [{'x-vercel-forwarded-for':''},{'x-vercel-forwarded-for':'bad'},{'x-vercel-forwarded-for':'192.0.2.1, 192.0.2.2'},{'user-agent':'facebookexternalhit/1.1'},{'sec-purpose':'prefetch'},{cookie:'jova-link-statistics=off'},{'sec-gpc':'1'},{dnt:'1'}])assert.equal(dailyLinkIdentity(request(headers),'instagram',env,at),null);
});
test('redirect repeat counting, new visitor and day reset work through storage; private hashes expire atomically',async()=>{
 const sets=new Map(),totals=new Map(),commands=[],tasks=[];let date=at;
 const execute=cmd=>{const [op,key,...args]=cmd;if(op==='HGETALL'){if(key==='shortlink:v1:links')return [];return [...(totals.get(key)||new Map())].flat();}if(op==='HINCRBY'){const m=totals.get(key)||new Map();totals.set(key,m);m.set(args[0],Number(m.get(args[0])||0)+Number(args[1]));return m.get(args[0]);}if(op==='HSET'||op==='HSETNX'){const m=totals.get(key)||new Map();totals.set(key,m);if(op==='HSET'||!m.has(args[0]))m.set(args[0],args[1]);return 1;}if(op==='EXPIRE')return 1;if(op==='SCARD')return sets.get(key)?.size||0;if(op==='EVAL'){assert.match(key,/SADD.*EXPIRE.*172800/);const daily=args[1],digest=args[2],s=sets.get(daily)||new Set();sets.set(daily,s);const old=s.size;s.add(digest);return s.size-old;}throw Error('Unexpected Redis operation '+op);};
 const store=createStore({env,now:()=>date,send:async(_url,options)=>{const cmd=JSON.parse(options.body);commands.push(cmd);return Response.json(cmd[0] instanceof Array?cmd.map(c=>({result:execute(c)})):{result:execute(cmd)});}});
 const go=createRedirectHandler({env,store,now:()=>date,schedule:task=>tasks.push(task)});
 for(let i=0;i<100;i++){assert.equal((await go(request(),'instagram')).status,302);}await Promise.all(tasks.splice(0).map(t=>t()));let data=(await store.list()).links.find(l=>l.code==='instagram');assert.equal(data.clicks,100);assert.equal(data.unique_today,1);
 await go(request({'x-vercel-forwarded-for':'192.0.2.2'}),'instagram');await tasks.pop()();data=(await store.list()).links.find(l=>l.code==='instagram');assert.equal(data.unique_today,2);
 date=new Date('2026-11-04T12:00:00Z');assert.equal((await store.list()).links.find(l=>l.code==='instagram').unique_today,0);await go(request(),'instagram');await tasks.pop()();assert.equal((await store.list()).links.find(l=>l.code==='instagram').unique_today,1);
 const serialized=JSON.stringify(commands);assert(!serialized.includes('192.0.2.'));assert(!serialized.includes('Mozilla'));assert(!serialized.includes('Chrome/'));
});
test('opt-out and privacy signals stop all recording; counting failures cannot change navigation',async()=>{
 let writes=0;const tasks=[],store={record:async()=>{writes++;throw Error('offline');}};const go=createRedirectHandler({env,store,schedule:fn=>tasks.push(fn)});
 for(const headers of [{cookie:'jova-link-statistics=off'},{'sec-gpc':'1'},{dnt:'1'}])assert.equal((await go(request(headers),'instagram')).status,302);assert.equal(tasks.length,0);assert.equal(writes,0);
 assert.equal((await go(request(),'instagram')).status,302);await tasks.pop()();assert.equal(writes,1);
});
