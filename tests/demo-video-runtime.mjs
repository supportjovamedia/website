import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {jovabookDemo} from '../lib/jovabook-demo.mjs';

const base=process.env.TEST_URL||'http://127.0.0.1:4482';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local checks only');

test('desktop and mobile demo loads on demand, plays, closes and supports seeking',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
   const media=[];page.on('request',request=>{if(request.url().includes('.mp4'))media.push(request.url());});
   await page.goto(base,{waitUntil:'networkidle',timeout:90000});
   assert.equal(media.length,0,'Idle homepage must not download video');
   const preview=page.locator('#ex-film [data-asset="poster"]');
   assert.equal(await preview.getAttribute('src'),jovabookDemo.poster);
   await preview.scrollIntoViewIfNeeded();
   await preview.evaluate(i=>i.decode());
   assert.equal(await preview.evaluate(i=>i.complete&&i.naturalWidth===1920),true);
   await page.getByRole('button',{name:'Watch the demo',exact:true}).click();
   const video=page.locator('#local-film video');
   assert.equal(await page.locator('#local-film').evaluate(d=>d.open),true);
   assert.equal(await video.getAttribute('src'),jovabookDemo.src);
   await video.evaluate(v=>v.play());
   await page.waitForFunction(()=>document.querySelector('#local-film video').currentTime>.5);
   assert.ok(Math.abs(await video.evaluate(v=>v.duration)-75)<.05);
   assert.equal(await video.evaluate(v=>v.error),null);
   const bounds=await video.boundingBox();
   assert.ok(Math.abs(bounds.width/bounds.height-16/9)<.02,'Player must keep the video aspect ratio');
   await page.screenshot({path:`output/demo-v15/player-${viewport.width}.png`});
   await page.getByRole('button',{name:'Close demo',exact:true}).click();
   assert.equal(await video.evaluate(v=>v.paused),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   const response=await page.request.get(base+jovabookDemo.src,{headers:{Range:'bytes=0-1023'}});
   assert.equal(response.status(),206);assert.equal((await response.body()).length,1024);
   await page.close();
  }
 }finally{await browser.close();}
});
