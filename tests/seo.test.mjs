import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3100';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local tests only');
const meta=(html,key)=>html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`))?.[1];
test('every indexable page has unique metadata, matching social URLs and valid organisation schema',async()=>{
 const xml=await(await fetch(base+'/sitemap.xml')).text();const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);const titles=new Set(),descriptions=new Set();
 for(const url of urls){const html=await(await fetch(base+new URL(url).pathname)).text();const title=html.match(/<title>(.*?)<\/title>/)?.[1];const description=meta(html,'description');assert.ok(title);assert.ok(description);assert.ok(!titles.has(title),url+' duplicate title');assert.ok(!descriptions.has(description),url+' duplicate description');titles.add(title);descriptions.add(description);assert.equal(meta(html,'og:url'),url);assert.equal(meta(html,'og:description'),description);assert.equal(meta(html,'twitter:description'),description);assert.ok(!/noindex/.test(meta(html,'robots')||''));const json=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.ok(json.some(x=>x['@graph']?.some(n=>n['@type']==='Organization')));}
});
test('service structured data and visible breadcrumbs agree with the canonical page',async()=>{
 const xml=await(await fetch(base+'/sitemap.xml')).text();for(const match of xml.matchAll(/<loc>(https:\/\/jovamedia.com\/services\/.*?)<\/loc>/g)){const url=match[1];const html=await(await fetch(base+new URL(url).pathname)).text();const data=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));const service=data.find(x=>x['@type']==='Service');assert.equal(service.url,url);assert.equal(service.provider['@id'],'https://jovamedia.com/#organisation');const trail=data.find(x=>x['@type']==='BreadcrumbList');assert.equal(trail.itemListElement.at(-1).item,url);assert.match(html,/aria-label="Breadcrumb"/);assert.match(html,/Explore related services/);}
});
test('unfinished insights stay accessible but outside search index and sitemap',async()=>{const response=await fetch(base+'/insights');assert.equal(response.status,200);assert.match(meta(await response.text(),'robots'),/noindex/);assert.ok(!(await(await fetch(base+'/sitemap.xml')).text()).includes('/insights'));});
