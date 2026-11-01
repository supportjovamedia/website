/* Local visual/interaction proof. Uses existing dependencies, no provider writes. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium,expect}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const base=process.env.TEST_URL||'http://127.0.0.1:4391',phase=process.env.GALLERY_QA_PHASE||'after',out=path.resolve('output/six-design-gallery',phase);
const target=new URL(base);
assert(['localhost','127.0.0.1'].includes(target.hostname)&&['http:','https:'].includes(target.protocol)&&!target.username&&!target.password&&target.pathname==='/'&&!target.search&&!target.hash,'TEST_URL must be a plain local origin');
const report={phase,checks:[],errors:[],external:[],screenshots:[]};
let browser,server,serverExit,serverError,serverLog='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function startServer(){
 if(process.env.TEST_URL)return;
 // An unrelated listener must never silently supply the proof.
 const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(4391,'127.0.0.1',()=>probe.close(resolve));});
 server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','4391'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,JOVA_BUILD_DIR:'.next-regression',NEXT_TELEMETRY_DISABLED:'1'}});
 const collect=chunk=>{serverLog=(serverLog+chunk).slice(-6000);};server.stdout.on('data',collect);server.stderr.on('data',collect);server.on('error',error=>{serverError=error;});serverExit=new Promise(resolve=>server.once('exit',resolve));
 const deadline=Date.now()+30000;
 while(Date.now()<deadline){
  if(serverError)throw serverError;
  if(server.exitCode!==null||server.signalCode!==null)throw Error('Gallery server exited before readiness: '+serverLog);
  try{const response=await fetch(base,{signal:AbortSignal.timeout(1000)});if(response.ok)return;}catch{}
  await delay(150);
 }
 throw Error('Gallery server did not become ready within 30 seconds: '+serverLog);
}
async function stopServer(){
 if(!server||server.exitCode!==null||server.signalCode!==null)return;
 server.kill();await Promise.race([serverExit,delay(3000)]);
 if(server.exitCode===null&&server.signalCode===null){server.kill('SIGKILL');await Promise.race([serverExit,delay(2000)]);}
}
async function screenshot(page,name){const filename=path.join(out,name+'.png');await page.screenshot({path:filename,animations:'allow'});const b=await readFile(filename);for(let i=8;i+12<=b.length;i+=b.readUInt32BE(i)+12)assert(!['eXIf','iTXt','tEXt','zTXt','caBX'].includes(b.toString('ascii',i+4,i+8)));report.screenshots.push(filename);}
const centre=gallery=>gallery.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:scrollY+r.top-(innerHeight-r.height)/2,behavior:'instant'});});
try{await mkdir(out,{recursive:true});await startServer();browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});for(const width of [1440,390,360]){
 const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===new URL(base).origin&&route.request().method()==='GET')return route.continue();report.external.push(url.origin+url.pathname);return route.abort();});await page.addInitScript(()=>localStorage.setItem('jovamedia-consent-v2',JSON.stringify({choice:'rejected',time:Date.now()})));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});const gallery=page.getByRole('region',{name:'Website design previews',exact:true});await expect(gallery).toBeVisible();await centre(gallery);await page.mouse.move(0,0);await expect(gallery).toHaveAttribute('data-in-view','true',{timeout:30000});await page.evaluate(()=>document.fonts.ready);await expect.poll(()=>gallery.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect.poll(()=>gallery.locator('img').evaluateAll(images=>images.filter(img=>{const r=img.getBoundingClientRect();return r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;}).every(img=>img.complete&&img.naturalWidth>0)),{timeout:60000}).toBe(true);const count=await gallery.locator('figure').count();assert.equal(count,phase==='before'?30:12);await expect(gallery.locator(':scope>div')).toHaveCount(phase==='before'?2:1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(phase==='after'){
  const figures=gallery.locator('figure');assert.equal(await figures.filter({has:page.locator('img[alt=""]')}).count(),6);const names=await gallery.locator('img:not([alt=""])').evaluateAll(images=>images.map(img=>img.alt));assert.deepEqual(names,['Qaiser Watches','Monolith','Elise','Stem Club','Sumera’s','Tamarind'].map(name=>name+' website preview'));assert(!(await gallery.innerText()).includes('●'));assert.equal(await gallery.locator('[class*=browserBar]').count(),0);const y=await figures.evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().y));assert(Math.max(...y)-Math.min(...y)<1,'All figures share one row');
  const animation=()=>gallery.evaluate(el=>{const animation=el.getAnimations({subtree:true})[0];return {state:animation?.playState,time:animation?.currentTime||0};});await expect(gallery).toHaveAttribute('data-in-view','true');await expect.poll(async()=> (await animation()).state).toBe('running');const start=await animation();await page.waitForTimeout(300);assert((await animation()).time-start.time>150,'Visible loop advances');await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await expect(gallery).toHaveAttribute('data-in-view','false');await expect.poll(async()=> (await animation()).state).toBe('paused');const stopped=await animation();await page.waitForTimeout(300);assert(Math.abs((await animation()).time-stopped.time)<1,'Offscreen loop stops');await centre(gallery);await expect.poll(async()=> (await animation()).state).toBe('running');const resumed=await animation();await page.waitForTimeout(300);assert((await animation()).time-resumed.time>150,'Returning loop resumes');
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>gallery.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);await expect(gallery.locator('figure:visible')).toHaveCount(6);await gallery.locator(':scope>div').evaluate(el=>{el.scrollLeft=el.scrollWidth;});await expect.poll(()=>gallery.locator(':scope>div').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await gallery.locator(':scope>div').evaluate(el=>{el.scrollLeft=0;});await screenshot(page,width+'-reduced-motion');await page.emulateMedia({reducedMotion:'no-preference'});await centre(gallery);await expect.poll(async()=> (await animation()).state).toBe('running');
 }
 await screenshot(page,width+'-gallery');const image=await gallery.locator('img').first().evaluate(img=>({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,sizes:img.sizes,src:img.currentSrc,naturalWidth:img.naturalWidth}));assert(Math.abs(image.width/image.height-1672/941)<.02);assert(image.sizes.includes('vw'));
 // Existing service controls and links remain real and usable after gallery scrolling.
 const social=page.getByRole('button',{name:'Social Media Marketing',exact:true});await social.scrollIntoViewIfNeeded();await social.click();await expect(social).toHaveAttribute('aria-pressed','true');const socialPanel=page.locator('#home-service-marketing');await expect(socialPanel).toHaveAttribute('data-active','true');await expect(socialPanel.getByRole('link',{name:'Social media management',exact:true})).toHaveAttribute('href','/services/social-management');const web=page.getByRole('button',{name:'Website Design',exact:true});await web.click();await expect(web).toHaveAttribute('aria-pressed','true');await expect(page.locator('#home-service-websites').getByRole('link',{name:'Website design details',exact:true})).toHaveAttribute('href','/websites');
 await page.locator('#home-service-websites').getByRole('link',{name:'Website design details',exact:true}).click();await expect(page).toHaveURL(new URL('/websites',base).href,{timeout:30000});await expect(page.locator('main h1').first()).toBeVisible({timeout:60000});report.checks.push({width,figures:count,image,passed:true});console.log('PASS '+phase+' gallery '+width);await context.close();
 }assert.deepEqual(report.errors,[]);report.status='passed';}catch(error){report.status='failed';report.error=String(error.stack||error);console.error(report.error);process.exitCode=1;}finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));try{await browser?.close();}finally{await stopServer();}console.log(JSON.stringify({status:report.status,widths:report.checks.length,errors:report.errors}));}
