import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4468'?r.continue():r.abort());const page=await context.newPage();await page.goto('http://127.0.0.1:4468/');const preview=page.locator('.ws-website-browser');await preview.scrollIntoViewIfNeeded();
 assert(await preview.evaluate(el=>!el.inert&&el.firstElementChild.inert));
 const box=await preview.boundingBox();await page.mouse.move(box.x+box.width/2,Math.min(800,box.y+box.height/2));await page.mouse.wheel(0,350);await page.waitForFunction(()=>document.querySelector('.ws-website-browser').scrollTop>0,{}, {timeout:3000});assert((await preview.evaluate(el=>el.scrollTop))>0);
 assert.equal(context.pages().length,1);assert.equal(new URL(page.url()).pathname,'/');console.log(width+': preview scrolls; website content stays inert');await context.close();
}}finally{await browser.close();}
