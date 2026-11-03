/* Read-only capture of the approved live hero. Temporary CSS affects this browser only. */
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=process.env.JOVABOOK_SHARE_SOURCE||'https://www.jovamedia.com/jovabook';
const output=new URL('../output/jovabook-share/',import.meta.url);
const target=new URL('../public/share/jovabook-hero-2026-11.png',import.meta.url);
await mkdir(output,{recursive:true});await mkdir(new URL('../public/share/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage({viewport:{width:1200,height:850},deviceScaleFactor:1});
 await page.route('**/*',route=>{const request=route.request();if(!['GET','HEAD'].includes(request.method())||/google-analytics|clarity\.ms|googletagmanager/.test(request.url()))return route.abort();return route.continue();});
 await page.goto(source,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const hero=page.locator('.ws-hero');
 await hero.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{image.src=image.closest('.ws-hero-phone')?'/jovabook/booking-mobile.webp':'/jovabook/calendar-desktop.webp';image.removeAttribute('srcset');await image.decode();}));});
 const originalText=await hero.innerText();
 await page.addStyleTag({content:`
  .ws-hero{padding:0!important;height:630px!important;min-height:630px!important;overflow:hidden!important}
  .ws-hero-inner{width:1200px!important;max-width:none!important;height:630px!important;min-height:0!important;padding:36px 44px!important;grid-template-columns:450px 1fr!important;gap:12px!important}
  .ws-hero-copy{position:relative!important;z-index:2!important}
  .ws-hero h1{font-size:58px!important;line-height:1.04!important;margin-bottom:25px!important}
  .ws-hero-copy>p{font-size:15px!important;line-height:1.7!important;max-width:410px!important;margin-bottom:24px!important}
  .ws-product-name{font-size:22px!important;margin-bottom:24px!important}
  .ws-hero-art{width:730px!important;height:550px!important;margin-left:0!important;transform:scale(.84)!important;transform-origin:left center!important}
  .ws-disc{width:510px!important;height:510px!important;right:25px!important;top:4px!important}
  .ws-hero-calendar{width:660px!important;left:0!important;top:54px!important}
  .ws-hero-phone{width:163px!important;left:45px!important;bottom:0!important}
  .ws-booked{left:232px!important;bottom:35px!important}
  .ws-hero *{animation:none!important;transition:none!important}
 `});
 const original=new URL('hero-capture-original.png',output);
 await hero.screenshot({path:original.pathname.replace(/^\/(\w:)/,'$1'),animations:'disabled'});
 // sharp removes source metadata by default. Keep the unmodified screenshot separately.
 await sharp(await readFile(original)).png({compressionLevel:9}).toFile(target.pathname.replace(/^\/(\w:)/,'$1'));
 const bytes=await readFile(target),metadata=await sharp(bytes).metadata();
 const manifest={source,captured_at:new Date().toISOString(),selector:'.ws-hero',width:metadata.width,height:metadata.height,original_text:originalText,assets:await hero.locator('img').evaluateAll(images=>images.map(image=>new URL(image.src).pathname)),sha256:createHash('sha256').update(bytes).digest('hex'),method:'Actual approved HTML/CSS hero captured with temporary layout CSS; no generated imagery; no forms submitted.'};
 await writeFile(new URL('capture-manifest.json',output),JSON.stringify(manifest,null,2));console.log(JSON.stringify({target:target.pathname,width:metadata.width,height:metadata.height,bytes:bytes.length,exif:Boolean(metadata.exif),xmp:Boolean(metadata.xmp),icc:Boolean(metadata.icc),manifest:manifest.source}));
}finally{await browser.close();}
