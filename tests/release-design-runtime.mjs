import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:4468',output='output/release-design-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report=[],errors=[];
try{for(const width of [360,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:width>700?1000:844},deviceScaleFactor:1});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');
 for(const design of ['Evergreen','Cobalt','Terracotta','Olive']){
  await page.getByRole('button',{name:new RegExp('^'+design+' ')}).click();const preview=page.locator('.ws-website-browser');assert(await preview.evaluate(el=>!el.inert&&el.firstElementChild.inert));assert.equal(await page.locator('.ws-example-label').count(),0);
  assert(await preview.locator('.wd-photo').evaluate(img=>img.complete&&img.naturalWidth>0));
  if(design==='Evergreen')assert.equal(await preview.locator('.wd-title').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390||width===1440)await preview.screenshot({path:output+'/'+width+'-'+design+'.png'});
 }
 await page.goto(origin+'/pricing');const plans=page.getByRole('region',{name:'JovaBook plans'});await plans.waitFor();const team=page.getByRole('article',{name:'Team plan'}),solo=page.getByRole('article',{name:'Solo plan'});
 await page.getByRole('button',{name:/Yearly/}).click();await expect(solo).toContainText('£16');await page.getByRole('button',{name:'Monthly',exact:true}).click();await expect(solo).toContainText('£20');await team.getByRole('spinbutton').fill('2');await expect(team.getByRole('link',{name:'Choose Team'})).toHaveAttribute('href',/seats=3/);await expect(team).toContainText('£37');
 await page.getByRole('button',{name:/Yearly/}).click();await expect(solo).toContainText('£16');await expect(team).toContainText('£29.60');await expect(team).toContainText('£355.20 billed yearly');
 assert.equal(await solo.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(17, 17, 17)');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390||width===1440)await plans.screenshot({path:output+'/'+width+'-pricing.png'});
 for(const route of ['/industries','/industries/hair-salons']){await page.goto(origin+route);await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.getByRole('heading',{level:1}).evaluate(el=>getComputedStyle(el).color),'rgb(17, 17, 17)');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');}
 report.push({width,designs:4,inert:true,pricingSeats:true,annualPricing:true,industryPages:2,overflow:false});await context.close();
}assert.deepEqual(errors,[]);await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser.close();}
