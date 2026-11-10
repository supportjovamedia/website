import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

test('production homepage has zero passive route requests before navigating',async()=>{
 const base=process.env.PREFETCH_TEST_URL||'http://127.0.0.1:3102',origin=new URL(base).origin;
 assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'This test only runs against a local production build');
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})}),report=[];
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),requests=[];let phase='initial';
   await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   page.on('request',request=>{const url=new URL(request.url()),headers=request.headers();if(url.origin===origin&&(url.searchParams.has('_rsc')||headers.rsc||headers['next-router-prefetch']))requests.push({phase,path:url.pathname,prefetch:headers['next-router-prefetch']||null,rsc:headers.rsc||null});});
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.vp-unified-calculator').waitFor();await page.waitForTimeout(1400);
   const initial=requests.length;phase='scroll';
   for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=650){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(80);}
   await page.waitForTimeout(1500);const passive=[...requests];report.push({width,initial,passive});
   assert.equal(passive.length,0,'Unvisited pages must not load in the background: '+JSON.stringify(passive));
   const notice=page.getByRole('region',{name:'Cookie choices'});if(await notice.isVisible()){await notice.getByRole('button',{name:'Reject all',exact:true}).click();await notice.waitFor({state:'hidden'});}
   phase='navigation';await page.locator('.jova-footer nav[aria-label="Legal and privacy"]').getByRole('link',{name:'Privacy',exact:true}).click();await page.waitForURL(url=>url.pathname==='/privacy-policy');await page.locator('h1').first().waitFor();
   assert(requests.some(request=>request.phase==='navigation'&&request.path==='/privacy-policy'),'Explicit link navigation still fetches its destination');
   await context.close();
  }
 }finally{await browser.close();await writeFile(new URL('../output/passive-link-request-budget.json',import.meta.url),JSON.stringify(report,null,2));}
});
