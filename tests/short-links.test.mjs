import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BUILTIN_LINKS,TRACKING_PERIOD,LOOKUP_TIMEOUT_MS,cleanLink,destinationUrl,isBot,isCode,createStore,createRedirectHandler,createOperatorLinksHandler} from '../lib/short-links.mjs';
const link={code:'nd-barber-01',platform:'nextdoor',medium:'social',campaign:'jovabook_outreach',content:'barber',destination:'/jovabook'};
const request=(ua='Mozilla/5.0 (iPhone) Safari',method='GET')=>new Request('https://www.jovamedia.com/go/example?ignored=value',{method,headers:{'user-agent':ua}});
function memoryStore(initial={}){
 const links={...initial},events=[],counts={};let reads=0,writes=0;
 return {links,events,get reads(){return reads;},get writes(){return writes;},async get(code){reads++;return links[code]||null;},async create(value){writes++;if(links[value.code])return false;links[value.code]=value;return true;},async list(){return {available:true,links:[...BUILTIN_LINKS,...Object.values(links)].map(item=>({...item,...(counts[item.code]||{clicks:0,bots:0,last:null}),stats_available:true}))};},async record(event){events.push(event);const totals=counts[event.code]||={clicks:0,bots:0,last:null};totals[event.bot?'bots':'clicks']++;totals.last=event.at;}};
}
const env={JOVABOOK_SUPABASE_URL:'https://db.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture-publishable'};
const redisEnv={UPSTASH_REDIS_REST_URL:'https://redis.example.test',UPSTASH_REDIS_REST_TOKEN:'fixture-redis'};
const operatorCall=(body={action:'list'},headers={})=>new Request('https://www.jovamedia.com/api/jovabook/operator/links',{method:'POST',headers:{authorization:'Bearer fixture-token','content-type':'application/json',...headers},body:JSON.stringify(body)});
const identity=(role='operator',status=200)=>async()=>Response.json({ok:status===200,role},{status});

test('codes, exact field shapes and campaign labels are validated',()=>{
 assert(isCode('nd-barber-01'));for(const bad of ['', 'A','x','-bad','has space','a/b','../x','x'.repeat(41),null])assert.equal(isCode(bad),false);
 assert.equal(cleanLink({...link,code:'ND-Barber-01',platform:'NextDoor'}).platform,'nextdoor');
 for(const input of [null,[],{...link,platform:'next door'},{...link,content:''},{...link,platform:2},{...link,extra:'field'},{...link,code:{value:'code'}}])assert.throws(()=>cleanLink(input));
 const {destination,...withoutDestination}=link;assert.equal(cleanLink(withoutDestination).destination,'/jovabook');
});

test('only explicit public marketing paths are allowed, including stored redirects',async()=>{
 for(const destination of ['https://evil.example/','//evil.example','/go/instagram','/go/nd-barber-01','/api/jovabook/operator/links','/operator.html','/jovabook/operator','/checkout','/basket','/newsletter/confirm','/jovabook?x=1','/a//b','jovabook','/jovabook#section','/jovabook/','/JovaBook','/go%2Finstagram','/../go/instagram','/\\evil.example']){
  assert.throws(()=>cleanLink({...link,destination}),destination);
  const go=createRedirectHandler({store:{get:async()=>({...link,destination})}});const result=await go(request(),link.code);assert.equal(result.headers.get('location'),'https://www.jovamedia.com/jovabook',destination);
 }
 for(const destination of ['/','/jovabook','/websites','/products','/pricing','/services','/contact','/get-a-quote'])assert.equal(cleanLink({...link,destination}).destination,destination);
});

test('campaign destinations use the canonical site and exactly four labels',()=>{
 const url=new URL(destinationUrl(link));assert.equal(url.origin+url.pathname,'https://www.jovamedia.com/jovabook');assert.deepEqual(Object.fromEntries(url.searchParams),{utm_source:'nextdoor',utm_medium:'social',utm_campaign:'jovabook_outreach',utm_content:'barber'});
});

test('three stable built-ins retain their labels and bypass unavailable storage',async()=>{
 const tasks=[],store={get:()=>{throw Error('Must not look up built-ins');},record:()=>{throw Error('Counting down');}},go=createRedirectHandler({store,schedule:task=>tasks.push(task)});
 assert.deepEqual(BUILTIN_LINKS.map(item=>item.code),['instagram','nextdoor','whatsapp']);
 for(const item of BUILTIN_LINKS){const response=await go(request(),item.code),url=new URL(response.headers.get('location'));assert.equal(response.status,302);assert.equal(url.pathname,'/jovabook');assert.deepEqual(Object.fromEntries(url.searchParams),{utm_source:item.code,utm_medium:item.code==='whatsapp'?'message':'social',utm_campaign:'jovabook_launch',utm_content:item.code==='instagram'?'direct_message':'introduction'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);}
 assert.equal(tasks.length,3);await Promise.all(tasks.map(task=>task()));
});

test('counting is deferred until the host runs its after-response task; events are aggregate only',async()=>{
 const store=memoryStore({[link.code]:link}),tasks=[],go=createRedirectHandler({store,schedule:task=>tasks.push(task),now:()=>new Date('2026-11-03T12:00:00Z')});
 const reads=[];const headers={get:key=>{reads.push(key);if(!['user-agent','cookie','sec-gpc','dnt','referer'].includes(key))throw Error('Unexpected request header access');return key==='user-agent'?'Mozilla/5.0':null;}};
 const response=await go({method:'GET',headers},link.code);assert.equal(response.status,302);assert.equal(store.events.length,0);assert.deepEqual(reads,['cookie','sec-gpc','dnt','user-agent','referer']);assert.equal(tasks.length,1);await tasks[0]();
 assert.deepEqual(store.events,[{code:link.code,bot:false,at:'2026-11-03T12:00:00.000Z',referrer:'direct'}]);await go(request('WhatsApp/2.23'),link.code);await tasks[1]();const data=await store.list(),item=data.links.find(item=>item.code===link.code);assert.equal(item.clicks,1);assert.equal(item.bots,1);assert.equal(Object.keys(item).some(key=>/unique/i.test(key)),false);
});

test('HEAD requests do not count and a missing or failing scheduler never blocks redirect',async()=>{
 const store=memoryStore(),tasks=[];const head=await createRedirectHandler({store,schedule:task=>tasks.push(task)})(request('Mozilla/5.0','HEAD'),'instagram');assert.equal(head.status,302);assert.equal(tasks.length,0);
 assert.equal((await createRedirectHandler({store,schedule:()=>{throw Error('No request context');}})(request(),'instagram')).status,302);assert.equal((await createRedirectHandler({store})(request(),'instagram')).status,302);assert.equal(store.events.length,0);
});

test('unknown, mismatched, malformed and slow custom lookups fall back within a short bounded wait',async()=>{
 for(const get of [async()=>null,async()=>{throw Error('Down');},async()=>({...link,code:'different'}),async()=>[]]){const response=await createRedirectHandler({store:{get}})(request(),link.code);assert.equal(response.headers.get('location'),'https://www.jovamedia.com/jovabook');}
 const start=Date.now(),response=await createRedirectHandler({store:{get:()=>new Promise(()=>{})}})(request(),link.code);assert.equal(response.status,302);assert.equal(LOOKUP_TIMEOUT_MS,250);assert(Date.now()-start<2000);
 assert.equal((await createRedirectHandler()(request(),'../etc')).status,404);
});

test('a stalled background counter has its own finite deadline and cannot hold the redirect',async()=>{
 const tasks=[],go=createRedirectHandler({store:{record:()=>new Promise(()=>{})},schedule:task=>tasks.push(task)});assert.equal((await go(request(),'instagram')).status,302);assert.equal(tasks.length,1);const start=Date.now();await tasks[0]();assert(Date.now()-start<2000);
});

test('preview agents are separate detected bots, including empty agents',()=>{
 for(const ua of ['WhatsApp/2.23','facebookexternalhit/1.1','Slackbot-LinkExpanding','Twitterbot',''])assert.equal(isBot(ua),true,ua);assert.equal(isBot('Mozilla/5.0 iPhone AppleWebKit Mobile Safari Instagram 300'),false);
});

test('storage sends one bounded pipeline of lifetime and expiring daily aggregates',async()=>{
 const calls=[],store=createStore({env:redisEnv,send:async(url,options)=>{calls.push({url,options,commands:JSON.parse(options.body)});return Response.json(JSON.parse(options.body).map(()=>({result:1})));}});
 await store.record({code:'instagram',bot:false,at:'2026-11-03T12:00:00.000Z'});assert.equal(calls.length,1);assert.equal(calls[0].url,'https://redis.example.test/pipeline');assert(calls[0].options.signal instanceof AbortSignal);assert.deepEqual(calls[0].commands.slice(0,3),[['HINCRBY','shortlink:v2:totals:instagram','clicks',1],['HSET','shortlink:v2:totals:instagram','last','2026-11-03T12:00:00.000Z'],['HSETNX','shortlink:v2:totals:instagram','started','2026-11-03T12:00:00.000Z']]);
 assert.doesNotMatch(JSON.stringify(calls[0].commands),/PFADD|PFCOUNT|visitor|agent|address/i);assert.equal(TRACKING_PERIOD.kind,'lifetime');assert.match(TRACKING_PERIOD.retention,/while the link exists/);await store.record({code:'instagram',bot:true,at:'2026-11-03T13:00:00.000Z'});assert.equal(calls[1].commands.length,5);assert.equal(calls[1].commands[0][2],'bots');assert(!calls[1].commands.some(command=>command[2]==='last'));
});

test('storage keeps aggregate and unique lookups separate and protects built-in metadata',async()=>{
 const calls=[],store=createStore({env:redisEnv,send:async(url,options)=>{const commands=JSON.parse(options.body);calls.push(commands);if(commands[0]==='HGETALL')return Response.json({result:['instagram',JSON.stringify({...link,code:'instagram',platform:'evil',destination:'/contact'}),link.code,JSON.stringify(link),'unsafe',JSON.stringify({...link,code:'unsafe',destination:'/go/instagram'})]});return Response.json(commands.map(([,key])=>({result:key.endsWith('instagram')?['clicks','4','bots','2','last','2026-11-03T12:00:00Z','started','2026-11-01T12:00:00Z']:[]})));}});
 const result=await store.list();assert.equal(result.available,true);assert.equal(calls.length,3);assert.equal(calls[1].length,4);const ig=result.links.find(link=>link.code==='instagram');assert.equal(ig.platform,'instagram');assert.equal(ig.destination,'/jovabook');assert.equal(ig.clicks,4);assert.equal(ig.bots,2);assert.equal(result.links.some(link=>link.code==='unsafe'),false);assert.equal(result.links.find(link=>link.code==='whatsapp').clicks,0);assert(result.links.every(link=>link.stats_available===true));
});

test('unavailable or malformed counters are unknown rather than zero',async()=>{
 for(const store of [createStore({env:{},send:()=>{throw Error('No request expected');}}),createStore({env:redisEnv,send:async()=>Response.json({error:'Down'},{status:503})}),createStore({env:redisEnv,send:async(_url,options)=>JSON.parse(options.body)[0]==='HGETALL'?Response.json({result:[]}):Response.json([{error:'Counter failed'},{result:[]},{result:[]}])})]){const result=await store.list();assert.equal(result.available,false);assert.equal(result.links.length,3);assert(result.links.every(link=>link.clicks===null&&link.bots===null&&link.stats_available===false));}
});

test('custom creation keeps shared codes immutable and enforces an atomic finite registry cap',async()=>{
 const calls=[],store=createStore({env:redisEnv,send:async(_url,options)=>{calls.push(JSON.parse(options.body));return Response.json({result:1});}});assert.equal(await store.create({...link}),true);assert.equal(calls[0][0],'EVAL');assert.match(calls[0][1],/HEXISTS.*HLEN.*HSETNX/);assert.equal(calls[0].at(-1),50);assert.equal(await store.create({...link,code:'instagram'}),false);assert.equal(calls.length,1);const full=createStore({env:redisEnv,send:async()=>Response.json({result:-1})});await assert.rejects(full.create(link),error=>error.status===409);
});

test('operator role is verified by the database and ordinary roles never reach storage',async()=>{
 const store=memoryStore();let identityCalls=0;const send=async(url,options)=>{identityCalls++;assert.equal(url,'https://db.example.test/rest/v1/rpc/portal_identity');assert.equal(options.headers.Authorization,'Bearer fixture-token');assert.deepEqual(JSON.parse(options.body),{p_claim:null});return Response.json({ok:true,role:'operator'});};
 const handler=createOperatorLinksHandler({env,store,send});assert.equal((await handler(new Request('https://x.test',{method:'GET'}))).status,405);assert.equal((await handler(operatorCall({action:'list'},{authorization:''}))).status,401);assert.equal((await handler(operatorCall({action:'list'},{authorization:'Bearer '+'a'.repeat(4097)}))).status,401);assert.equal((await handler(operatorCall({action:'list'},{origin:'https://evil.example'}))).status,403);assert.equal(identityCalls,0);
 for(const role of ['owner','business','customer','unassigned'])assert.equal((await createOperatorLinksHandler({env,store,send:identity(role)})(operatorCall({action:'list'}))).status,403);
 assert.equal((await createOperatorLinksHandler({env,store,send:identity('operator',401)})(operatorCall({action:'list'}))).status,401);assert.equal(store.writes,0);const listed=await handler(operatorCall());assert.equal(listed.status,200);const body=await listed.json();assert.equal(body.available,true);assert.equal(body.base,'https://www.jovamedia.com/go/');assert.equal(body.links.length,3);assert.deepEqual(body.period,TRACKING_PERIOD);assert(body.links.every(link=>link.builtin));
});

test('operator list/create require bounded, explicit JSON actions and safe fields',async()=>{
 const store=memoryStore(),handler=createOperatorLinksHandler({env,store,send:identity()});
 for(const body of [{},null,[],{action:'delete'},{action:'list',link},{action:'create'},{action:'create',link:[]},{action:'create',link:{...link,unexpected:true}},{action:'create',link:{...link,destination:'/go/instagram'}},{action:'list',extra:true}])assert.equal((await handler(operatorCall(body))).status,400,JSON.stringify(body));
 const malformed=new Request('https://www.jovamedia.com/api/jovabook/operator/links',{method:'POST',headers:{authorization:'Bearer fixture-token'},body:'{bad'});assert.equal((await handler(malformed)).status,400);assert.equal((await handler(operatorCall({action:'create',link:{...link,content:'a'.repeat(9000)}}))).status,400);assert.equal(store.writes,0);
 const created=await handler(operatorCall({action:'create',link}));assert.equal(created.status,200);assert((await created.json()).links.some(item=>item.code===link.code));assert.equal((await handler(operatorCall({action:'create',link}))).status,409);assert.equal((await handler(operatorCall({action:'create',link:{...link,code:'Instagram'}}))).status,409);assert.equal(store.writes,2);
});

test('operator sees usable built-in URLs with unknown counts during a storage outage',async()=>{
 const store={list:async()=>{throw Error('Redis down');},create:async()=>{throw Error('Redis down');}},handler=createOperatorLinksHandler({env,store,send:identity()});const response=await handler(operatorCall());assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.equal(body.available,false);assert.equal(body.links.length,3);assert(body.links.every(link=>link.clicks===null&&link.bots===null&&link.stats_available===false));for(const item of body.links)assert.equal(new URL(destinationUrl(item)).pathname,'/jovabook');assert.equal((await handler(operatorCall({action:'create',link}))).status,503);
});

test('route injects documented Next.js after scheduling and carries bounded runtime',async()=>{
 const route=await readFile(new URL('../app/go/[code]/route.js',import.meta.url),'utf8');assert.match(route,/import\s*\{after\}\s*from 'next\/server'/);assert.match(route,/createRedirectHandler\(\{schedule:after\}\)/);assert.match(route,/maxDuration=5/);
});
