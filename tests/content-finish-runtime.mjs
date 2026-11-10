import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {chromium,expect} from '@playwright/test';
import {sections,dialogs} from '../app/jovabook/story/sections.mjs';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');

test('content spacing, four product captions and screenshot proportions stay balanced',async()=>{
 const swc=require('next/dist/build/swc');await swc.loadBindings();
 const booking=await swc.transform(await readFile(new URL('../app/jovabook/story/OriginalSections.js',import.meta.url),'utf8'),{filename:'OriginalSections.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}}),exports={};
 vm.runInNewContext(booking.code,{exports,React,Intl,require:name=>name==='react'?React:{portalScreens}});
 const bookingMarkup=renderToStaticMarkup(React.createElement(exports.InteractiveBooking));
 const landing=await readFile(new URL('../app/jovabook/story/Landing.js',import.meta.url),'utf8');
 const files=[...landing.matchAll(/import '([^']+\.css)'/g)].map(match=>new URL('../app/jovabook/story/'+match[1],import.meta.url));
 const css=(await Promise.all(files.map(file=>readFile(file,'utf8')))).join('\n');
 const moduleSource=(await readFile(new URL('../app/jovabook/story/calculator.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
 const engine=moduleSource+'\n'+(await readFile(new URL('../app/jovabook/story/enhance-story.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'').replace('export function enhanceStory','function enhanceStory');
 const publicRoot=fileURLToPath(new URL('../public/',import.meta.url)),measurements=[];
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  for(const width of [360,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width<701?844:900}}),errors=[];await page.emulateMedia({reducedMotion:'reduce'});page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',async route=>{const url=new URL(route.request().url()),file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));if(url.hostname!=='fixture.local'||!file.startsWith(publicRoot))return route.abort();try{return await route.fulfill({body:await readFile(file),contentType:({'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream'});}catch{return route.abort();}});
   const html=sections.map(section=>section.includes('id="booking-mount"')?'<div id="booking-mount">'+bookingMarkup+'</div>':section).map(section=>'<div class="story-fragment">'+section+'</div>').join('');
   await page.setContent('<base href="https://fixture.local/"><style>'+css+'\nbody{margin:0;font-family:Arial,sans-serif}</style><main class="jovabook-story"><div id="jova-story-concept">'+html+dialogs+'</div></main>');
   await page.evaluate(({engine,portalScreens})=>{window.portalScreens=portalScreens;window.eval(engine+';enhanceStory(document.getElementById("jova-story-concept"));');},{engine,portalScreens});
   await page.evaluate(()=>Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));await page.evaluate(()=>new Promise(requestAnimationFrame));
   const measurement=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect(),style=selector=>getComputedStyle(document.querySelector(selector));
    const cards=[...document.querySelector('.vp-reason-track').children].filter(card=>!card.hasAttribute('data-loop-clone'));
    const navigation=document.querySelector('#why-jovabook .vp-swipe-navigation'),anchor=navigation&&!navigation.hidden?navigation:document.querySelector('.vp-reason-track');
    const image=document.querySelector('#portal-theme-image'),imageRect=image.getBoundingClientRect();
    return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,why:cards.map(card=>({height:card.getBoundingClientRect().height,lines:card.querySelector('p').getBoundingClientRect().height/parseFloat(getComputedStyle(card.querySelector('p')).lineHeight)})),navigationGroups:document.querySelectorAll('#why-jovabook .vp-swipe-navigation').length,gapToProduct:rect('#ex-product .ex-section-head h2').top-anchor.getBoundingClientRect().bottom,captionSize:style('#ex-product-title').fontSize,industrySize:style('#service-businesses h2').fontSize,taglineSize:style('.vp-industry-intro').fontSize,dashboard:{width:imageRect.width,height:imageRect.height,ratio:imageRect.width/imageRect.height,natural:image.naturalWidth/image.naturalHeight},shareGap:rect('#ex-websites .vp-share-benefit').top-rect('#ex-websites .nr-phone').bottom,demoPadding:style('#booking-mount').paddingTop,cursor:style('#ex-product-preview').cursor};
   });
   assert.equal(measurement.overflow,false,'Horizontal overflow at '+width);assert.equal(measurement.navigationGroups,1);assert.equal(measurement.why.length,4);assert(measurement.why.every(card=>card.height<=355),'Compact benefit cards at '+width);if(width<701)assert(measurement.why.every(card=>card.lines<=3.05),'Body copy uses at most three lines at '+width);
   assert(measurement.gapToProduct>=0&&measurement.gapToProduct<=62,'Bounded gap before product heading at '+width);assert.equal(measurement.captionSize,measurement.industrySize);assert(parseFloat(measurement.taglineSize)>=16);assert(Math.abs(measurement.dashboard.ratio-measurement.dashboard.natural)<.015,'Dashboard keeps its actual aspect ratio');if(width<701)assert(measurement.dashboard.height<=innerHeightFor(width)*.72);assert(measurement.shareGap>=27&&measurement.shareGap<=33);assert.equal(measurement.cursor,'default');
   for(const [key,title] of [['services','Your services, ready to book.'],['clients','Know who’s coming in.'],['insights','See what keeps your diary busy.'],['calendar','See the shape of your day.']]){await page.locator('[data-screen="'+key+'"]').click();await expect(page.locator('#ex-product-title')).toHaveText(title);assert.equal(await page.locator('#ex-product-title').evaluate(el=>getComputedStyle(el).fontSize),measurement.industrySize);}
   assert.deepEqual(errors,[]);measurements.push(measurement);await page.close();
  }
 }finally{await browser.close();await writeFile(new URL('../output/content-finish-measurements.json',import.meta.url),JSON.stringify(measurements,null,2));}
 function innerHeightFor(){return 844;}
 console.log(JSON.stringify(measurements));
});
