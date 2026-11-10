// Capture only the local fictional demo. External requests are blocked.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';
const origin='http://127.0.0.1:4466',archive='output/product-screens-refresh',dest='public/jovabook/portal';
await mkdir(archive,{recursive:true});
const manifest=JSON.parse(await readFile(dest+'/manifest.json','utf8')),report=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const device of ['mobile','desktop']){
 const context=await browser.newContext({viewport:device==='mobile'?{width:390,height:844}:{width:1600,height:1000},deviceScaleFactor:2});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/?preview=day#login');
 await page.getByRole('textbox',{name:'Email',exact:true}).fill('demo@jovamedia.com');await page.locator('input[name=password]').fill('Salon2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.locator('.shell.jb-reference').waitFor();
 await page.evaluate(()=>{const k='jovabook-essential-demo-v2',s=JSON.parse(localStorage.getItem(k));const business=s.salons.find(b=>b.id==='drink');for(const booking of business.bookings)booking.notes='';const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const note=business.bookings.find(b=>b.date===date&&b.time==='09:30')||business.bookings.find(b=>b.date===date);if(note)note.notes='Please ring the bell when you arrive. I have a special request to discuss before the appointment.';localStorage.setItem(k,JSON.stringify(s));localStorage.setItem('jovabook-workspace-theme','classic');});
 for(const route of (process.env.CAPTURE_ONLY_CALENDAR?['calendar']:['calendar','services','customers','insights'])){
  await page.goto(origin+'/?preview=day#'+route);await page.reload();await page.locator('.shell.jb-reference').waitFor();
  if(route==='calendar'){await page.getByRole('button',{name:device==='mobile'?'Day':'Week',exact:true}).click();await page.locator('[data-action=booking-details]:visible').first().waitFor();}
  await page.evaluate(async()=>{await document.fonts.ready;});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow '+device+' '+route);
  const original=archive+'/'+device+'-'+route+'@2x.png';await page.screenshot({path:original,animations:'disabled'});
  const bytes=await sharp(original).webp({lossless:true,effort:6}).toBuffer(),sha=createHash('sha256').update(bytes).digest('hex'),meta=await sharp(bytes).metadata();
  assert(!meta.exif&&!meta.xmp&&!meta.iptc);assert(!/ChatGPT|OpenAI|GPT-image|C2PA/i.test(bytes.toString('latin1')));
  const name=(route==='calendar'&&device==='desktop'?'calendar-week':route)+'-'+device+'-'+sha.slice(0,12)+'.webp',key=device+'.'+(route==='calendar'&&device==='desktop'?'calendar-week':route);
  await writeFile(dest+'/'+name,bytes);portalScreens[key]={url:'/jovabook/portal/'+name,width:meta.width,height:meta.height};manifest.screens[key]={...portalScreens[key],bytes:bytes.length,sha256:sha,metadata:{exif:false,xmp:false,iptc:false,provenanceMarkers:false}};
  const colors=await page.evaluate(()=>({accent:getComputedStyle(document.documentElement).getPropertyValue('--jg-highlight').trim(),theme:document.documentElement.dataset.workspaceTheme}));
  // Lossless output must reproduce every RGB pixel of the original capture.
  const raw=await sharp(original).removeAlpha().raw().toBuffer(),encoded=await sharp(bytes).removeAlpha().raw().toBuffer();assert(raw.equals(encoded));
  report.push({device,route,...colors,bytes:bytes.length,losslessPixels:true});
 }
 assert.deepEqual(errors,[]);await context.close();
}
manifest.captured='2026-11-10';manifest.source='Actual localhost:4466 fictional JovaBook demo; refreshed product screens captured as lossless WebP at 2x.';
await writeFile(dest+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('app/jovabook/story/portal-screens.mjs','// Actual local fictional demo screenshots. Product refresh: scripts/refresh-product-screens.mjs.\nexport const portalScreens = '+JSON.stringify(portalScreens,null,2)+';\n');
for(const file of ['app/jovabook/story/enhance-story.js','app/jovabook/story/sections.mjs']){
 let source=await readFile(file,'utf8');
 for(const device of ['desktop','mobile'])for(const name of (device==='desktop'?['calendar-week','services','customers','insights']:['calendar','services','customers','insights']))source=source.replace(new RegExp('/jovabook/portal/'+name+'-'+device+'-[a-f0-9]+\\.webp','g'),portalScreens[device+'.'+name].url);
 await writeFile(file,source);
}
await writeFile(archive+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
