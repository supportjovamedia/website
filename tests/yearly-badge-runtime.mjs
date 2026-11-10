import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.TEST_URL||'http://127.0.0.1:4482';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local checks only');

test('Yearly saving stays centred before and after hydration on both pricing surfaces',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report=[];
 await mkdir('output/yearly-badge',{recursive:true});
 try{
  for(const pathname of ['/','/pricing'])for(const width of [360,390,768,1440])for(const javaScriptEnabled of [false,true]){
   const page=await browser.newPage({javaScriptEnabled,viewport:{width,height:900}});
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.addInitScript(()=>localStorage.setItem('jovamedia-consent-v2',JSON.stringify({choice:'rejected',time:Date.now()})));
   await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   await page.goto(new URL(pathname,base).href,{waitUntil:'networkidle',timeout:90000});
   const annual=page.locator('#ex-pricing [data-cadence=annual]');
   if(javaScriptEnabled){
    if(pathname==='/')await page.waitForFunction(()=>document.querySelector('#jova-story-concept')?.dataset.enhanced==='true');
    await annual.click();await page.waitForFunction(()=>document.querySelector('#ex-solo-price')?.textContent==='£16');
   }
   const check=async()=>{
    assert.equal(await annual.locator('.sw-yearly-saving').count(),1);
    const geometry=await annual.evaluate(el=>{
     const b=el.getBoundingClientRect(),tag=el.querySelector('.sw-yearly-saving'),t=tag.getBoundingClientRect(),s=getComputedStyle(tag);
     return{offset:Math.abs(b.x+b.width/2-t.x-t.width/2),badgeWidth:t.width,badgeHeight:t.height,top:t.y-b.y,colour:s.backgroundColor,radius:s.borderRadius};
    });
    assert(geometry.offset<.6,JSON.stringify({pathname,width,javaScriptEnabled,...geometry}));
    assert(geometry.badgeHeight>20&&geometry.badgeWidth>60,'Badge must remain readable');
    assert(geometry.top<0,'Badge sits above Yearly');
    assert.equal(geometry.radius,'99px');
    report.push({pathname,width,javaScriptEnabled,...geometry});
   };
   await check();
   if(javaScriptEnabled){
    await page.locator('#ex-pricing [data-cadence=monthly]').click();
    assert.equal(await page.locator('#ex-solo-price').textContent(),'£20');
    await check();
    if([390,1440].includes(width))await page.locator('.ex-billing-switch').screenshot({path:`output/yearly-badge/${pathname==='/'?'home':'pricing'}-${width}.png`});
   }
   await page.close();
  }
 }finally{await browser.close();await writeFile('output/yearly-badge/report.json',JSON.stringify(report,null,2));}
});
