// Recapture the real fictional portal locally, without JPEG intermediates or external requests.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';

const origin='http://127.0.0.1:4466',archive='output/hero-share-quality',destination='public/jovabook/portal';
await mkdir(archive,{recursive:true});
const manifest=JSON.parse(await readFile(destination+'/manifest.json','utf8')),report=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [key,viewport,route,stem] of [
  ['hero.macbook',{width:1280,height:832},'dashboard','hero-macbook-air-13'],
  ['hero.iphone',{width:440,height:956},'calendar','hero-iphone-17-pro-max']
 ]){
  const context=await browser.newContext({viewport,deviceScaleFactor:2});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?preview=day#login');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('demo@jovamedia.com');
  await page.locator('input[name=password]').fill('Salon2026');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.locator('.shell.jb-reference').waitFor();
  await page.evaluate(()=>{
   localStorage.setItem('jovabook-workspace-theme','classic');
   const key='jovabook-essential-demo-v2',state=JSON.parse(localStorage.getItem(key));
   const business=state.salons.find(b=>b.id==='drink');
   for(const booking of business.bookings)booking.notes='';
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const booking=business.bookings.find(b=>b.date===today&&b.time==='09:30');
   if(booking)booking.notes='Please ring the bell when you arrive. I have a special request to discuss before the appointment.';
   localStorage.setItem(key,JSON.stringify(state));
  });
  await page.goto(origin+'/?preview=day#'+route);await page.reload();
  await page.locator('.shell.jb-reference').waitFor();
  await page.getByRole('button',{name:route==='calendar'?'Day':'Week',exact:true}).click();
  if(route==='calendar')await page.locator('[data-action=booking-details]:visible').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const colors=await page.evaluate(()=>({accent:getComputedStyle(document.documentElement).getPropertyValue('--jg-highlight').trim(),theme:document.documentElement.dataset.workspaceTheme,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(colors.accent.toLowerCase(),'#ffd700');assert.equal(colors.theme,'classic');assert.equal(colors.overflow,false);
  const original=archive+'/'+stem+'@2x.png';await page.screenshot({path:original,animations:'disabled'});
  const bytes=await sharp(original).webp({lossless:true,effort:6}).toBuffer(),metadata=await sharp(bytes).metadata();
  const hash=createHash('sha256').update(bytes).digest('hex'),name=stem+'-'+hash.slice(0,12)+'.webp';
  assert.equal(metadata.width,viewport.width*2);assert.equal(metadata.height,viewport.height*2);
  assert(!metadata.exif&&!metadata.xmp&&!metadata.iptc&&!metadata.icc);
  assert(!/ChatGPT|OpenAI|GPT-image|C2PA/i.test(bytes.toString('latin1')));
  assert((await sharp(original).removeAlpha().raw().toBuffer()).equals(await sharp(bytes).removeAlpha().raw().toBuffer()));
  const previousBytes=manifest.screens[key].bytes;
  await writeFile(destination+'/'+name,bytes);
  portalScreens[key]={url:'/jovabook/portal/'+name,width:metadata.width,height:metadata.height};
  manifest.screens[key]={...portalScreens[key],bytes:bytes.length,sha256:hash,metadata:{exif:false,xmp:false,iptc:false,provenanceMarkers:false}};
  report.push({key,...colors,...portalScreens[key],previousBytes,bytes:bytes.length,losslessPixels:true});
  assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(destination+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 await writeFile('app/jovabook/story/portal-screens.mjs','// Actual local fictional demo screenshots. Product refresh: scripts/refresh-product-screens.mjs.\nexport const portalScreens = '+JSON.stringify(portalScreens,null,2)+';\n');
 await writeFile(archive+'/capture-report.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();}
