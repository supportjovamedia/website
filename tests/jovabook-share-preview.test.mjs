import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {jovabookMetadata} from '../app/jovabook/search-data.mjs';
import {socialPreview} from '../lib/social-preview.mjs';
const asset=new URL('../public'+socialPreview.url,import.meta.url);
test('JovaBook OG and Twitter share the versioned hero with correct dimensions and approved page title',async()=>{
 const metadata=jovabookMetadata(),expected=new URL(socialPreview.url,'https://www.jovamedia.com').href;
 assert.equal(metadata.title.absolute,'Online Booking System for Small Businesses | JovaBook');
 assert.equal(metadata.openGraph.title,metadata.title.absolute);assert.equal(metadata.twitter.title,metadata.title.absolute);
 assert.equal(metadata.alternates.canonical,'https://www.jovamedia.com/');
 assert.deepEqual(metadata.openGraph.images,metadata.twitter.images);
 assert.equal(metadata.openGraph.images.length,1);const image=metadata.openGraph.images[0];assert.equal(image.url,expected);assert.equal(image.width,1200);assert.equal(image.height,630);assert.match(image.alt,/dashboard.*mobile calendar/);
 assert.equal(metadata.twitter.card,'summary_large_image');
});
test('The delivered PNG is 1200 by 630 and contains no embedded provenance or personal metadata',async()=>{
 const bytes=await readFile(asset),metadata=await sharp(bytes).metadata();assert.equal(metadata.format,'png');assert.equal(metadata.width,1200);assert.equal(metadata.height,630);assert(bytes.length<5000000);
 for(const field of ['exif','xmp','iptc','icc'])assert.equal(metadata[field],undefined,field);
 const chunks=[];for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);chunks.push(type);offset+=length+12;}
 for(const type of ['eXIf','tEXt','zTXt','iTXt','caBX'])assert(!chunks.includes(type),'Unexpected metadata chunk '+type);
 assert(!/ChatGPT|OpenAI|GPT-image|C2PA/.test(bytes.toString('latin1')));
});
