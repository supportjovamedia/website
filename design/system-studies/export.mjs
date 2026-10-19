import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { systemPhotos } from '../../lib/website-systems.mjs';
const source = process.argv[2];
if (!source) throw new Error('Pass the absolute directory containing the original browser captures.');
const out = new URL('../../public/websites/systems/', import.meta.url);
await mkdir(out, { recursive:true });
const audit = [];
for (const image of Object.values(systemPhotos)) {
  const name = image.src.split('/').at(-1);
  const input = await readFile(`${source}/${name.replace('.webp','.jpg')}`);
  const bytes = await sharp(input).resize(1600,1000,{fit:'fill'}).webp({quality:87,effort:6,smartSubsample:true}).toBuffer();
  const meta = await sharp(bytes).metadata();
  if (meta.width!==1600 || meta.height!==1000 || meta.exif || meta.xmp || meta.icc || meta.iptc) throw new Error(`Unexpected image metadata: ${name}`);
  const chunks = [];
  for(let offset=12;offset+8<=bytes.length;) { const tag=bytes.toString('ascii',offset,offset+4), size=bytes.readUInt32LE(offset+4); chunks.push(tag); offset+=8+size+(size%2); }
  if(chunks.some(tag=>!['VP8 ','VP8L','VP8X','ALPH'].includes(tag))) throw new Error(`Unexpected WebP chunk in ${name}: ${chunks.join(',')}`);
  if(bytes.length>180_000) throw new Error(`Image exceeds 180 kB budget: ${name}`);
  await writeFile(new URL(name,out),bytes);
  audit.push({file:image.src,bytes:bytes.length,width:meta.width,height:meta.height,sha256:createHash('sha256').update(bytes).digest('hex'),chunks,embeddedMetadata:false});
}
await writeFile(new URL('./export-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({images:audit.length,totalBytes:audit.reduce((n,x)=>n+x.bytes,0),largestBytes:Math.max(...audit.map(x=>x.bytes)),metadata:'No EXIF, XMP, ICC, IPTC or provenance container chunks'},null,2));
