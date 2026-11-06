// Run deliberately when source artwork changes, never during a visit or build.
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const target=new URL('public/jovabook/industries/',root);
const sources={
 dashboard:['public/jovabook/dashboard.webp','JovaBook dashboard showing appointments, bookings and calendar controls','product'],
 calendar:['public/jovabook/calendar-desktop.webp','The JovaBook calendar with appointments arranged across the week','product'],
 services:['public/jovabook/services.webp','Service names, prices and appointment durations in JovaBook','product'],
 booking:['public/jovabook/booking-mobile.webp','The JovaBook appointment booking page on a phone','phone'],
 salon:['public/websites/photography/salon-website-design-hero-main.webp','Chairs and mirrors in a hair salon','photo'],
 barber:['public/websites/photography/salon-website-design-scope-one.webp','A barber chair reflected in a salon mirror','photo'],
 room:['public/websites/photography/salon-website-design-editorial-one.webp','A calm waiting area with seating','photo'],
 spa:['public/jovabook/industry-spa.webp','A massage treatment in progress','photo'],
 tutor:['public/jovabook/education-black-tutor.webp','A tutor and student working through a lesson','photo'],
 fitness:['public/home-agency/fitness.webp','A woman in fitness clothing','photo'],
};
await mkdir(target,{recursive:true});
const manifest={};
for(const [key,[source,alt,kind]] of Object.entries(sources)){
 const variants={};
 const widths=kind==='photo'?[480,960]:kind==='phone'?[320,480]:[640,1120];
 for(const [index,variant] of ['small','large'].entries()){
  const width=widths[index];
  const {data,info}=await sharp(fileURLToPath(new URL(source,root))).rotate().resize({width,withoutEnlargement:true}).webp({quality:kind==='photo'?70:82,effort:6}).toBuffer({resolveWithObject:true});
  const hash=createHash('sha256').update(data).digest('hex').slice(0,12);
  const name=`${key}-${variant}-${hash}.webp`;
  await writeFile(new URL(name,target),data);
  const metadata=await sharp(data).metadata();
  if(metadata.exif||metadata.xmp||metadata.icc||data.includes(Buffer.from('c2pa')))throw Error(`Unexpected export metadata: ${name}`);
  variants[variant]={src:`/jovabook/industries/${name}`,width:info.width,height:info.height,bytes:data.length};
 }
 manifest[key]={alt,kind,...variants};
}
await writeFile(new URL('lib/jovabook-industry-media.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([key,value])=>[key,{small:value.small.bytes,large:value.large.bytes}]))));
