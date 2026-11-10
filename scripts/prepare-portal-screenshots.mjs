import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function screenshotSources(archive){
 const sources=[];
 for(const device of ['Desktop','Mobile']){
  for(const name of ['dashboard',device==='Desktop'?'calendar-week':'calendar','bookings','customers','services','staff','insights'])sources.push({key:device.toLowerCase()+'.'+name,device:device.toLowerCase(),source:path.join(archive,device,name+'@2x.jpg'),pixelRatio:2,stem:name+'-'+device.toLowerCase()});
 }
 for(const theme of ['classic','botanical','glass','graphite','editorial','studio']){
  for(const device of ['desktop','mobile'])sources.push({key:`theme.${theme}.${device}`,device,source:path.join(archive,'Themes',`${theme}-${device}@2x.jpg`),pixelRatio:2,stem:`dashboard-${theme}-${device}`});
 }
 sources.push({key:"hero.macbook",device:"desktop",source:path.join(archive,"Hero","macbook-air-13@2x.jpg"),pixelRatio:2,stem:"hero-macbook-air-13"},{key:"hero.iphone",device:"mobile",source:path.join(archive,"Hero","iphone-17-pro-max@2x.jpg"),pixelRatio:2,stem:"hero-iphone-17-pro-max"});
 return sources;
}
export function validateScreenshotDimensions({key,device,source,pixelRatio=1},{width,height}){
 const label=source||key;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0)throw Error('Screenshot dimensions are missing or invalid: '+label);
 if(device==='mobile'&&!(height>width&&width<=600*pixelRatio))throw Error(`Mobile screenshot must be portrait and no wider than 600 CSS pixels: ${label} (${width}x${height})`);
 if(device==='desktop'&&width<=height)throw Error(`Desktop screenshot must be landscape: ${label} (${width}x${height})`);
}
export async function preparePortalScreenshots({archive=path.resolve(root,'../../JovaBook Portal Screenshots/2026-11-10'),destination=path.join(root,'public/jovabook/portal'),moduleTarget=path.join(root,'app/jovabook/story/portal-screens.mjs')}={}){
 // Read and validate every original before creating directories or replacing any output.
 // Use the same bytes during conversion so a concurrent capture cannot bypass this check.
 const sources=await Promise.all(screenshotSources(archive).map(async entry=>{
  const original=await readFile(entry.source);validateScreenshotDimensions(entry,await sharp(original).metadata());return {...entry,original};
 }));
 await mkdir(destination,{recursive:true});
 const manifest={captured:'2026-11-10',source:'Actual localhost:4458 JovaBook demo, with fictional Avery Studio records',screens:{}};
 for(const {key,stem,original} of sources){
  const bytes=await sharp(original).webp({quality:95,effort:6}).toBuffer(),hash=createHash('sha256').update(bytes).digest('hex'),filename=`${stem}-${hash.slice(0,12)}.webp`,metadata=await sharp(bytes).metadata();
  if(metadata.exif||metadata.xmp||metadata.iptc||/ChatGPT|OpenAI|GPT-image|C2PA/i.test(bytes.toString('latin1')))throw Error('Unexpected metadata in '+filename);
  await writeFile(path.join(destination,filename),bytes);
  manifest.screens[key]={url:'/jovabook/portal/'+filename,width:metadata.width,height:metadata.height,bytes:bytes.length,sha256:hash,metadata:{exif:false,xmp:false,iptc:false,provenanceMarkers:false}};
 }
 await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(moduleTarget,'// Generated from actual local portal screenshots. Rebuild with prepare-portal-screenshots.mjs.\nexport const portalScreens = '+JSON.stringify(Object.fromEntries(Object.entries(manifest.screens).map(([key,{url,width,height}])=>[key,{url,width,height}])),null,2)+';\n');
 await writeFile(path.join(archive,'capture-manifest.json'),JSON.stringify({...manifest,originalsPreserved:true},null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const manifest=await preparePortalScreenshots();console.log(JSON.stringify({screens:Object.keys(manifest.screens).length,totalBytes:Object.values(manifest.screens).reduce((sum,x)=>sum+x.bytes,0),heroBytes:manifest.screens['hero.macbook'].bytes+manifest.screens['hero.iphone'].bytes,manifest:'public/jovabook/portal/manifest.json'}));
}
