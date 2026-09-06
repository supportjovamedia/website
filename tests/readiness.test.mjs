import {test} from "node:test";
import assert from "node:assert/strict";
const base=process.env.TEST_URL || "http://localhost:3100";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname))throw Error("Local tests only");
test("new share card is referenced by both social metadata formats and returns a 1200x630 PNG",async()=>{
 const html=await(await fetch(base)).text();
 for(const key of ["og:image","twitter:image"])assert.match(html,new RegExp('(?:property|name)="'+key+'" content="https://www.jovamedia.com/share/jovamedia-2026"'));
 const response=await fetch(base+"/share/jovamedia-2026");assert.equal(response.status,200);assert.match(response.headers.get("content-type"),/image\/png/);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
});
test("organisation identifies the London business and configured social profiles",async()=>{
 const html=await(await fetch(base)).text();const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 const org=graph["@graph"].find(n=>n["@type"]==="Organization");assert.equal(org.address.addressCountry,"GB");assert.equal(org.address.addressLocality,"London");assert.ok(org.sameAs.length>=1);assert.ok(org.sameAs.every(url=>url.startsWith("https://")));assert.equal(org.url,"https://www.jovamedia.com");
});
