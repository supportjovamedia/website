import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

test('FAQ tails join a single matching border without connector lines in grey and red states',async()=>{
 const base=process.env.FAQ_TEST_URL||'http://127.0.0.1:3000',origin=new URL(base).origin;
 assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local fixture only');
 const dir='output/faq-tail-proof';await mkdir(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})}),report=[];
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});
   await page.addInitScript(()=>localStorage.setItem('jovamedia-consent-v2',JSON.stringify({choice:'rejected',time:Date.now()})));
   await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#jova-story-concept')?.dataset.enhanced==='true');
   const cards=page.locator('#faq [data-story-card]');assert.equal(await cards.filter({visible:true}).count(),6);
   for(const index of [0,5])for(const active of [false,true]){
    const card=cards.nth(index),bubble=card.locator('details');await card.scrollIntoViewIfNeeded();await bubble.hover();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(({index,active})=>{const cards=[...document.querySelectorAll('#faq [data-story-card]')];cards.forEach((card,i)=>card.dataset.current=String(i===(active?index:index===0?1:0)));},{index,active});
    const state=await bubble.evaluate(e=>{const c=getComputedStyle(e),tail=getComputedStyle(e,'::before'),after=getComputedStyle(e,'::after'),r=e.getBoundingClientRect();return{body:c.borderLeftWidth,bodyColour:c.borderLeftColor,outline:c.outlineStyle,tailLeft:tail.borderLeftWidth,tailBottom:tail.borderBottomWidth,tailColour:tail.borderLeftColor,marker:getComputedStyle(e.parentElement.querySelector('[data-story-marker]')).backgroundColor,connector:after.content,top:parseFloat(tail.top),border:parseFloat(c.borderTopWidth),rect:{x:r.x,y:r.y,width:r.width,height:r.height}};});
    assert.equal(state.body,'2px');assert.equal(state.tailLeft,state.body);assert.equal(state.tailBottom,state.body);assert.equal(state.tailColour,state.bodyColour);assert.equal(state.bodyColour,active?'rgb(237, 16, 57)':'rgb(205, 217, 226)');assert.equal(state.outline,'none');assert.equal(state.connector,'none');
    assert.equal(state.marker,active?'rgb(237, 16, 57)':'rgb(16, 47, 77)');
    const clip={x:Math.max(0,state.rect.x-18),y:Math.max(0,state.rect.y-3),width:state.rect.width+21,height:state.rect.height+6};
    const screenshot=await page.screenshot({clip,path:`${dir}/${width}-${index===0?'first':'team'}-${active?'red':'grey'}.png`});
    const {data,info}=await sharp(screenshot).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const x=Math.round(state.rect.x-clip.x+1),y=Math.round(state.rect.y-clip.y+state.border+state.top+7),offset=(y*info.width+x)*info.channels;
    assert(data[offset]>245&&data[offset+1]>245&&data[offset+2]>245,'Tail masks the old vertical border seam');
    report.push({width,index,active,...state});
   }
   await cards.nth(0).locator('summary').click();assert.equal(await cards.nth(0).locator('details').getAttribute('open'),'');
   await page.getByRole('button',{name:'Show more FAQs'}).click();assert.equal(await cards.filter({visible:true}).count(),10);
   await page.getByRole('button',{name:'Show fewer FAQs'}).click();assert.equal(await cards.filter({visible:true}).count(),6);await page.close();
  }
 }finally{await browser.close();await writeFile(`${dir}/measurements.json`,JSON.stringify(report,null,2));}
});
