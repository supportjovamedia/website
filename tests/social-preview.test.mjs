import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {socialPreview} from "../lib/social-preview.mjs";

const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
test("share image is refreshed whenever its hero, logo or capture layout changes",async()=>{
 const manifest=JSON.parse(await readFile(new URL("../public/share/social-preview-manifest.json",import.meta.url)));
 assert.equal(socialPreview.url,manifest.image);
 for(const required of ["components/DaybreakHero.js","components/DaybreakHero.module.css","scripts/capture-social-preview.cjs","public/brand/jova-logo-white.png"]){
  assert.ok(manifest.sources[required],`Missing freshness check for ${required}`);
 }
 for(const [file,expected] of Object.entries(manifest.sources)){
  assert.equal(sha(await readFile(new URL("../"+file,import.meta.url))),expected,`${file} changed. Recapture the social preview before publishing.`);
 }
 const image=await readFile(new URL("../public"+socialPreview.url,import.meta.url));
 assert.equal(sha(image),manifest.sha256);
 assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
 assert.ok(image.length<5_000_000);
 const chunks=[];for(let offset=8;offset<image.length;){chunks.push(image.toString("ascii",offset+4,offset+8));offset+=image.readUInt32BE(offset)+12}
 assert.ok(chunks.every(type=>["IHDR","IDAT","IEND","pHYs"].includes(type)),`Unexpected embedded metadata: ${chunks}`);
});
