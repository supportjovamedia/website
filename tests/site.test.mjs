import {test} from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3100';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Tests must target a local preview.');
test('every sitemap page responds with its canonical URL and one main heading',async()=>{
 const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);
 const routes=[...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>new URL(match[1]).pathname);
 assert.equal(routes.length,30);
 for(const route of routes){const response=await fetch(base+route);assert.equal(response.status,200,route);const html=await response.text();assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,route+' h1');const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);assert.ok(canonical,route+' canonical exists');assert.equal(new URL(canonical[1]).pathname,route,route+' canonical path');assert.equal(new URL(canonical[1]).hostname,'jovamedia.com');assert.ok(html.includes('name="description"'),route+' description');}
});
test('unknown pages and service slugs return real 404 responses',async()=>{for(const path of ['/does-not-exist','/services/does-not-exist'])assert.equal((await fetch(base+path)).status,404,path)});
test('terms alias remains available with its primary canonical URL',async()=>{const response=await fetch(base+'/terms-of-service');assert.equal(response.status,200);assert.match(await response.text(),/rel="canonical" href="https:\/\/jovamedia.com\/terms"/)});
test('contact endpoint truthfully reports unconfigured delivery',async()=>{const response=await fetch(base+'/api/contact',{method:'POST'});assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).ok,false)});
test('robots and social preview remain available',async()=>{const robots=await fetch(base+'/robots.txt');assert.equal(robots.status,200);assert.match(await robots.text(),/https:\/\/jovamedia.com\/sitemap.xml/);const image=await fetch(base+'/opengraph-image');assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/png/)});
