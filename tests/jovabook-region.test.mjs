import test from 'node:test';
import assert from 'node:assert/strict';
import {regionDecision,regionEndpoint} from '../lib/jovabook-region.mjs';
const h=o=>new Headers(o);
test('UK, crown dependencies and the USA are allowed; other countries are not',()=>{
 for(const c of ['GB','gb','IM','JE','GG','US','us'])assert.equal(regionDecision(h({'x-vercel-ip-country':c})).allowed,true);
 for(const c of ['IN','PK','FR','CA'])assert.equal(regionDecision(h({'x-vercel-ip-country':c})).allowed,false);
 assert.equal(regionDecision(h({})).allowed,true);
});
test('endpoint answers with CORS only for JovaMedia origins',async()=>{
 const e=regionEndpoint();
 const ok=await e.GET(new Request('https://www.jovamedia.com/api/jovabook/region',{headers:{origin:'https://book.jovamedia.com','x-vercel-ip-country':'IN'}}));
 const body=await ok.json();
 assert.equal(body.allowed,false);assert.match(body.message,/United Kingdom and the United States/);
 assert.equal(ok.headers.get('access-control-allow-origin'),'https://book.jovamedia.com');
 const bad=await e.GET(new Request('https://www.jovamedia.com/api/jovabook/region',{headers:{origin:'https://evil.example','x-vercel-ip-country':'GB'}}));
 assert.equal(bad.headers.get('access-control-allow-origin'),null);assert.equal((await bad.json()).allowed,true);
});
