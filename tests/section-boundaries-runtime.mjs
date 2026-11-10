import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

test('actual local homepage has distinct full-width bands and aligned desktop content',async()=>{
 const base=process.env.SECTION_TEST_URL||'http://127.0.0.1:3000';
 const origin=new URL(base).origin,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})}),report=[];
 try{
  for(const width of [360,390,768,1440,1920]){
   const page=await browser.newPage({viewport:{width,height:width<701?844:1000}});
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.content-band-stories .cs-card').first().waitFor();
   await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});})]));
   const measured=await page.evaluate(()=>{
    const definitions=[['Hero','.art-hero',null],['Meet film','.q4-demo-band','rgb(255, 255, 255)'],['Why choose','#why-jovabook','rgb(241, 242, 242)'],['Product','.nv-section-band:has(>#ex-product)','rgb(255, 255, 255)'],['Workspace','#workspace-details','rgb(255, 255, 255)'],['Industries','#service-businesses','rgb(241, 242, 242)'],['Booking demo','#booking-mount','rgb(255, 255, 255)'],['Booking tools','#booking-tools','rgb(241, 242, 242)'],['Website','#ex-websites','rgb(255, 255, 255)'],['Dashboard','.nv-section-band:has(>#ex-themes)','rgb(241, 242, 242)'],['Calculator','#ex-compare','rgb(255, 255, 255)'],['Stories','.content-band-stories','rgb(241, 242, 242)'],['Pricing','.nv-section-band:has(>#ex-pricing)','rgb(255, 255, 255)'],['Live chat','.content-band-support','rgb(241, 242, 242)'],['Referrals','.content-band-referrals','rgb(255, 255, 255)'],['FAQ','#ex-faq','rgb(241, 242, 242)'],['Ending','.nv-ending','rgb(255, 255, 255)'],['Checklist','.jova-newsletter','rgb(241, 242, 242)']];
    const bands=definitions.map(([name,selector,expected])=>{const element=document.querySelector(selector),rect=element.getBoundingClientRect(),style=getComputedStyle(element),inner=element.matches('#ex-compare,#booking-tools,#ex-websites')?element.querySelector('.js-wrap'):element.matches('.jova-newsletter')?element.querySelector('#growth-signup'):element.firstElementChild;const paddingElement=name==='Dashboard'?element.querySelector('#ex-themes'):name==='Pricing'?element.querySelector('#ex-pricing'):name==='Checklist'?inner:element;return {name,expected,background:style.backgroundColor,left:rect.left,width:rect.width,top:rect.top+scrollY,bottom:rect.bottom+scrollY,border:style.borderTopWidth,paddingTop:getComputedStyle(paddingElement).paddingTop,paddingBottom:getComputedStyle(paddingElement).paddingBottom,innerPadding:element.matches('.content-band')?getComputedStyle(inner).paddingTop:null};});
    for(let i=1;i<bands.length;i++)bands[i].gapBefore=bands[i].top-bands[i-1].bottom;
    const widthSelectors=['#ex-themes','#ex-compare>.js-wrap','.cs-stories','#ex-pricing','#ex-support','#ex-referral','#ex-faq .ws-original-faq'];
    const content=widthSelectors.map(selector=>{const rect=document.querySelector(selector).getBoundingClientRect();return {selector,left:rect.left,width:rect.width};});
    const growth=document.querySelector('#growth-signup'),g=getComputedStyle(growth),r=growth.getBoundingClientRect();content.push({selector:'#growth-signup content',left:r.left+parseFloat(g.paddingLeft),width:r.width-parseFloat(g.paddingLeft)-parseFloat(g.paddingRight)});
    const productCaption=document.querySelector('#ex-product .ex-product-details');let captionSurface=productCaption;while(captionSurface&&getComputedStyle(captionSurface).backgroundColor==='rgba(0, 0, 0, 0)')captionSurface=captionSurface.parentElement;const captionBackground=captionSurface?getComputedStyle(captionSurface).backgroundColor:null;
    const whole=['.art-hero','.q4-demo-band','#why-jovabook','#ex-product','#workspace-details','#service-businesses','#booking-mount',...definitions.map(([,selector])=>selector)].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,top:r.top+scrollY,bottom:r.bottom+scrollY,height:r.height};});
    return {viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,bands,content,whole,captionBackground};
   });
   report.push(measured);assert.equal(measured.captionBackground,'rgb(255, 255, 255)','Product caption belongs to white product group at '+width);assert.equal(measured.overflow,false,'Overflow at '+width);
   for(const band of measured.bands){if(band.expected!==null)assert.equal(band.background,band.expected,band.name+' surface at '+width);assert(Math.abs(band.left)<1&&Math.abs(band.width-width)<2,band.name+' band fills viewport at '+width);if(band.gapBefore!==undefined)assert(Math.abs(band.gapBefore)<2,band.name+' contiguous boundary at '+width+': '+band.gapBefore);assert.equal(band.border,['Hero','Workspace'].includes(band.name)?'0px':'1px',band.name+' boundary at '+width);if(['Booking tools','Website','Dashboard','Calculator','Stories','Pricing','Live chat','Referrals','FAQ','Ending','Checklist'].includes(band.name))assert(parseFloat(band.paddingTop)>=32&&parseFloat(band.paddingTop)<=48,band.name+' balanced padding');if(band.innerPadding!==null)assert.equal(band.innerPadding,'0px','No doubled component padding');}
   if(width>=1440)for(const content of measured.content){assert(Math.abs(content.width-1160)<2,'Shared1160 width '+content.selector+' at '+width+': '+content.width);assert(Math.abs(content.left-(width-1160)/2)<2,'Centered content '+content.selector+' at '+width);}
   await page.close();
  }
 }finally{await browser.close();await writeFile(new URL('../output/section-boundaries-measurements.json',import.meta.url),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report.map(({viewport,bands,content})=>({viewport,bands:bands.map(({name,background,gapBefore,paddingTop})=>({name,background,gapBefore,paddingTop})),content}))));
});
