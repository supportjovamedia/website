import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingEmbed} from '../lib/jovabook-embed.mjs';
const env={JOVABOOK_SUPABASE_URL:'https://fixture.supabase.co',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture'};
function fixture({plan='standard',standalone=false,canonical=false,found=true}={}){const calls=[];return {calls,GET:createBookingEmbed({env,standalone,canonical,readShell:async()=>'<html><head><link href="/app.css"></head><body><script src="/app.js"></script><script src="/assets/owner-app.0123456789abcdef0123.js"></script></body></html>',send:async(url,init)=>{calls.push({url,init});return Response.json(found?{slug:'fixture',offer_version:'2026-11-free-v1',embed_allowed:plan!=='essential'}:null);}})};}
const request=new Request('https://www.jovamedia.com/api/jovabook/embed/fixture');
test('only server-entitled paid businesses can embed, with absolute assets and noindex',async()=>{const f=fixture(),r=await f.GET(request,{params:Promise.resolve({slug:'fixture'})});assert.equal(r.status,200);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors https:/);const html=await r.text();assert(html.includes('https://book.jovamedia.com/app.js'));assert(html.includes('https://book.jovamedia.com/app.css'));assert(html.includes('window.JOVA_EMBED_SLUG="fixture"'));assert.equal(f.calls[0].init.cache,'no-store');assert.deepEqual(JSON.parse(f.calls[0].init.body),{p_slug:'fixture'});});
test('Free embed is denied but standalone payment return remains available',async()=>{const f=fixture({plan:'essential'});assert.equal((await f.GET(request,{params:{slug:'fixture'}})).status,403);const r=await fixture({plan:'essential',standalone:true}).GET(request,{params:{slug:'fixture'}});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Security-Policy'),"frame-ancestors 'none'");assert((await r.text()).includes('window.JOVA_STANDALONE_BOOKING=true'));});
test('unknown and malformed slugs fail without rendering arbitrary scripts',async()=>{const f=fixture({found:false});assert.equal((await f.GET(request,{params:{slug:'fixture'}})).status,404);const bad=fixture();assert.equal((await bad.GET(request,{params:{slug:'</script>'}})).status,404);assert.equal(bad.calls.length,0);});

test('main-site booking and account use the locally deployed owner bundle with noindex',async()=>{
 const f=fixture({plan:'essential',standalone:true,canonical:true});
 for(const view of ['booking','account']){
  const r=await f.GET(new Request('https://www.jovamedia.com/book/fixture?view='+view),{params:{slug:'fixture'}});
  assert.equal(r.status,200);
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');
  const html=await r.text();
  assert(html.includes('src="/api/jovabook/assets/owner-app.0123456789abcdef0123.js"'));
  assert(!html.includes('JOVA_EMBED_SLUG'));
 }
});
