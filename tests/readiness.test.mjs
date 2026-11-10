import {test} from "node:test";
import assert from "node:assert/strict";
import {socialPreview} from '../lib/social-preview.mjs';
const base=process.env.TEST_URL || "http://localhost:3100";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname))throw Error("Local tests only");
test("new share card is referenced by both social metadata formats and returns a 1200x630 PNG",async()=>{
 const html=await(await fetch(base)).text();
 const expected=new URL(socialPreview.url,'https://www.jovamedia.com').href;
 for(const key of ['og:image','twitter:image']){const pattern=new RegExp('(?:property|name)="'+key+'" content="([^\"]+)"');assert.equal(html.match(pattern)?.[1],expected);}
 const response=await fetch(base+socialPreview.url);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
});
test("organisation identifies the London business and configured social profiles",async()=>{
 const html=await(await fetch(base)).text();
 const nodes=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match=>{const schema=JSON.parse(match[1]);return schema["@graph"]||[schema];});
 const org=nodes.find(n=>n["@type"]==="Organization");assert.ok(org,"Organisation exists in the page's structured data");assert.equal(org.address.addressCountry,"GB");assert.equal(org.address.addressLocality,"London");assert.ok(org.sameAs.length>=1);assert.ok(org.sameAs.every(url=>url.startsWith("https://")));assert.equal(org.url,"https://www.jovamedia.com");
});
