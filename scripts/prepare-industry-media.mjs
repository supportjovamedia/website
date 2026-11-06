// Run deliberately when source artwork changes, never during a visit or build.
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const target=new URL('public/jovabook/industries/',root);
const sources={
 salon:['public/websites/photography/salon-website-design-hero-main.webp','Chairs and mirrors in a hair salon'],
 spa:['public/jovabook/industry-spa.webp','A massage treatment in progress'],
 fitness:['public/home-agency/fitness.webp','A woman in fitness clothing'],
 tutor:['public/jovabook/education-black-tutor.webp','A tutor working with a student'],
 desk:['public/home-agency/desk.webp','A workspace with a closed laptop and camera'],
 calendar:['public/jovabook/calendar-desktop.webp','JovaBook weekly calendar with example appointments'],
 services:['public/jovabook/services.webp','Services, prices and durations in the JovaBook dashboard'],
};
await mkdir(target,{recursive:true});
const manifest={};
for(const [key,[source,alt]] of Object.entries(sources)){
 const variants={};
 for(const [variant,width] of [['small',640],['large',1120]]){
  const {data,info}=await sharp(fileURLToPath(new URL(source,root))).rotate().resize({width,withoutEnlargement:true}).webp({quality:key==='calendar'||key==='services'?82:72,effort:6}).toBuffer({resolveWithObject:true});
  const hash=createHash('sha256').update(data).digest('hex').slice(0,12);
  const name=`${key}-${variant}-${hash}.webp`;
  await writeFile(new URL(name,target),data);
  const metadata=await sharp(data).metadata();
  if(metadata.exif||metadata.xmp||metadata.icc||data.includes(Buffer.from('c2pa')))throw Error(`Unexpected export metadata: ${name}`);
  variants[variant]={src:`/jovabook/industries/${name}`,width:info.width,height:info.height,bytes:data.length};
 }
 manifest[key]={alt,...variants};
}
await writeFile(new URL('lib/jovabook-industry-media.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([key,value])=>[key,{small:value.small.bytes,large:value.large.bytes}]))));
