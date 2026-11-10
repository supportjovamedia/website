import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {bundlePage} from '../booking-demo/build-assets.mjs';
import {createBookingEmbed} from '../lib/jovabook-embed.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),shellFile=path.join(root,'booking-demo/dist/index.html');
const bundled=await bundlePage({page:'owner',html:await readFile(path.join(root,'booking-demo/index.html'),'utf8'),readSource:file=>readFile(path.join(root,'booking-demo',file),'utf8')});
const env={JOVABOOK_SUPABASE_URL:'https://fixture.supabase.co',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture'};
const routes=await Promise.all(['embed','booking'].map(async surface=>({surface,file:path.join(root,'app/api/jovabook',surface,'[slug]/route.js'),source:await readFile(path.join(root,'app/api/jovabook',surface,'[slug]/route.js'),'utf8')})));
function routeFixture(route,{allowed=true,missing=false}={}){
 const reads=[],calls=[],context={path,process:{cwd:()=>root},readFile:async(file,encoding)=>{reads.push({file,encoding});assert.equal(file,shellFile);if(missing)throw Error('Missing generated shell');return bundled.html;},createBookingEmbed:options=>createBookingEmbed({...options,env,send:async(url,options)=>{calls.push({url,options});return Response.json({slug:'fixture',offer_version:'2026-11-free-v1',embed_allowed:allowed});}})};
 vm.runInNewContext(route.source.replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ')+'\nthis.GET=GET;',context);
 return {GET:context.GET,reads,calls};
}
for(const route of routes)test(route.surface+' route serves only the generated shell with absolute bundled assets',async()=>{
 const f=routeFixture(route),response=await f.GET(new Request('https://www.jovamedia.com/api/jovabook/'+route.surface+'/fixture'),{params:Promise.resolve({slug:'fixture'})});
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert.equal(f.reads.length,1);assert.equal(f.reads[0].encoding,'utf8');const html=await response.text();
 for(const asset of bundled.assets)assert(html.includes('https://book.jovamedia.com'+asset.url),asset.file);
 assert.equal([...html.matchAll(/<script\b[^>]*src=/g)].length,3);assert.equal([...html.matchAll(/<link\b[^>]*rel="stylesheet"/g)].length,1);assert(!html.includes('src="https://book.jovamedia.com/app.js'));assert(html.includes('window.JOVA_EMBED_SLUG="fixture"'));assert(html.includes('window.JOVA_STANDALONE_BOOKING='+(route.surface==='booking')));
 assert.equal(JSON.parse(f.calls[0].options.body).p_slug,'fixture');assert.equal(f.calls[0].options.cache,'no-store');assert.equal(response.headers.get('Content-Security-Policy'),route.surface==='booking'?"frame-ancestors 'none'":'frame-ancestors https: http://localhost:* http://127.0.0.1:*');
});
test('embed entitlement and malformed slug guards still run before generated shell access',async()=>{
 const denied=routeFixture(routes[0],{allowed:false});assert.equal((await denied.GET(new Request('https://fixture.test'),{params:{slug:'fixture'}})).status,403);assert.equal(denied.reads.length,0);
 const malformed=routeFixture(routes[0]);assert.equal((await malformed.GET(new Request('https://fixture.test'),{params:{slug:'</script>'}})).status,404);assert.equal(malformed.calls.length,0);assert.equal(malformed.reads.length,0);
 const standalone=routeFixture(routes[1],{allowed:false});assert.equal((await standalone.GET(new Request('https://fixture.test'),{params:{slug:'fixture'}})).status,200);
 const unavailable=routeFixture(routes[0],{missing:true});assert.equal((await unavailable.GET(new Request('https://fixture.test'),{params:{slug:'fixture'}})).status,503);assert.equal(unavailable.reads.length,1);
});
test('main build generates the shell before Next traces both dynamic routes',async()=>{
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));assert.match(pkg.scripts.build,/^node booking-demo\/build-assets\.mjs\s*&&\s*next build$/);
 const require=createRequire(import.meta.url),{nodeFileTrace}=require('next/dist/compiled/@vercel/nft');
 for(const route of routes){const trace=await nodeFileTrace([route.file],{base:root,processCwd:root,readFile:async file=>file===shellFile?bundled.html:readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT'||error.code==='EISDIR')return null;throw error;}),stat:async file=>stat(file===shellFile?path.join(root,'booking-demo/index.html'):file).catch(error=>{if(error.code==='ENOENT')return null;throw error;})});assert([...trace.fileList].some(file=>file.replaceAll('\\','/')==='booking-demo/dist/index.html'),route.surface+' generated shell must be traced');}
});
