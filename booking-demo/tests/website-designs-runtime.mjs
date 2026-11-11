// Real portal UI, synthetic built-in business, all external requests blocked.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),output=fileURLToPath(new URL('../../output/website-designs-review/',import.meta.url));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.cjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local.test').pathname,file=path.resolve(root,pathname==='/'?'index.html':'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})}),report={checks:[],errors:[],externalBlocked:0,screenshots:[]};
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},deviceScaleFactor:1});
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin){report.externalBlocked++;return route.abort();}if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:(await readFile(path.join(root,'config.js'),'utf8'))});return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(origin+'/?preview=day#login');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('demo@jovamedia.com');await page.locator('input[name=password]').fill('Salon2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  if(width===390){await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('button',{name:'Website',exact:true}).click();}else await page.getByRole('link',{name:'Website',exact:true}).click();
  for(const [id,name] of [['one-page','Evergreen'],['brightside','Cobalt'],['form','Terracotta'],['willow','Olive']]){
   await page.getByRole('button',{name:'Website design Choose a layout for your website'}).click();
   await page.locator('.bw-layout-choice:has(input[value="'+id+'"])').click();
   const save=page.getByRole('button',{name:'Save changes',exact:true});if(await save.isEnabled())await save.click();
   await page.reload();
   await page.getByRole('button',{name:'Website design Choose a layout for your website'}).click();
   assert(await page.locator('input[name=template][value="'+id+'"]').isChecked(),name+' survives save and reload');
   if(width===390&&id==='willow')await page.screenshot({path:path.join(output,'390-dashboard-mobile-picker.png'),fullPage:true});
   await page.getByRole('button',{name:'Website settings',exact:true}).click();await page.getByRole('button',{name:'Preview',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Website preview'}),site=dialog.locator('.wd-site');await site.waitFor();assert.equal(await site.getAttribute('data-website-design'),name);
   const geometry=await site.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns}));assert(geometry.scroll<=geometry.width+1,name+' has no horizontal overflow at '+width);
   assert(geometry.width<=420,name+' selected-design preview stays phone-sized even on desktop');
   if(width===1440&&['Cobalt','Olive'].includes(name)){const publicPage=await context.newPage();await publicPage.goto(origin+'/?demo=jova-demo#website');assert.equal(await publicPage.locator('.wd-site').evaluate(el=>getComputedStyle(el).display),'grid',name+' public website retains its desktop sidebar');await publicPage.close();}
   const heroImage=site.locator('.wd-photo');assert(await heroImage.evaluate(img=>img.complete&&img.naturalWidth>0),name+' sample image loads locally');
   const credit=site.getByRole('link',{name:'Powered by JovaMedia'});assert.equal(await credit.getAttribute('href'),'https://www.jovamedia.com/');assert((await credit.evaluate(el=>getComputedStyle(el).textDecorationLine)).includes('underline'));
   assert.equal(await site.locator('svg path[d="M4 12h16m-6-6 6 6-6 6"]').count(),0,'No decorative arrows');
   const heroFile=width+'-'+id+'-hero.png';await dialog.screenshot({path:path.join(output,heroFile)});report.screenshots.push(heroFile);
   if(width===390){const menu=site.locator('.wd-menu');await menu.locator('summary').click();assert(await menu.evaluate(el=>el.open));await menu.locator('summary').click();assert(!(await menu.evaluate(el=>el.open)));await menu.locator('summary').click();await page.keyboard.press('Escape');assert(!(await menu.evaluate(el=>el.open)));await menu.locator('summary').click();await menu.getByRole('button',{name:'Services',exact:true}).click();assert(!(await site.locator('.wd-menu').getAttribute('open')),'Mobile menu closes after navigation');}else await site.locator('.wd-sidebar-nav').getByRole('button',{name:'Services',exact:true}).isVisible().then(async visible=>{if(visible)await site.locator('.wd-sidebar-nav').getByRole('button',{name:'Services',exact:true}).click();});
   await site.locator('.wd-more-services summary').click();assert(await site.locator('.wd-more-services').evaluate(el=>el.open));await site.getByRole('link',{name:'Express facial £40.00'}).waitFor({state:'visible'});
   const serviceFile=width+'-'+id+'-services.png';await dialog.screenshot({path:path.join(output,serviceFile)});report.screenshots.push(serviceFile);
   if(width===390&&id==='willow'){
    const popupPromise=page.waitForEvent('popup');await site.getByRole('link',{name:'Express facial £40.00'}).click();const popup=await popupPromise;await popup.getByRole('heading',{name:'Book a service',exact:true}).waitFor();await popup.close();report.checks.push('Website booking link opens working local customer booking flow');
   }
   await dialog.getByRole('button',{name:'Close preview',exact:true}).click();assert(await page.getByRole('button',{name:'Save changes',exact:true}).isDisabled());report.checks.push(name+' '+width+': selection, save/reload, preview, layout, image, menu, services and credit');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[],'No browser exceptions');
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
