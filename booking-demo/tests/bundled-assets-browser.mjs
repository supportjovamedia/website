/* Built deployment smoke and real HTTP-cache counters. All account APIs are local mocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),dist=path.join(root,'dist');
const output=path.resolve(root,'../output/bundled-assets-browser');
execFileSync(process.execPath,[path.join(root,'build-assets.mjs')],{cwd:root,stdio:'pipe'});
const sid='20000000-0000-4000-8000-000000000001',uid='30000000-0000-4000-8000-000000000001';
const requests=[],phases=[],errors=[],external=[];
let origin;
const config=await readFile(path.join(root,'config.js'),'utf8');
const serviceURL=config.match(/url:\s*['"]([^'"]+)['"]/)[1];
const user={id:uid,email:'owner@example.test',email_confirmed_at:'2026-01-01T12:00:00Z',user_metadata:{}};
const access={ok:true,access:'active',reason:'paid',business:{id:sid,name:'Bundle QA Business',slug:'bundle-qa',plan:'essential',status:'active'},lifecycle:{},billing:{connected:false,canCheckout:false},staff_limit:1};
const session={access_token:'bundle-fixture-owner',refresh_token:'bundle-fixture-refresh',expires_at:Date.now()/1000+3600,user};
function responseFor(url){
 const route=url.pathname;
 if(route==='/auth/v1/token')return session;
 if(route==='/auth/v1/user')return user;
 if(route==='/auth/v1/logout')return {};
 if(route==='/api/jovabook/billing/status')return access;
 if(route==='/rest/v1/salons')return [{id:sid,owner_id:uid,name:'Bundle QA Business',slug:'bundle-qa',plan:'essential',status:'active',settings:{seeded:true},payments:{}}];
 if(route==='/rest/v1/rpc/portal_identity')return {ok:true,role:'operator'};
 if(route==='/rest/v1/rpc/operator_businesses')return {ok:true,businesses:[],total:0};
 if(route==='/rest/v1/rpc/operator_overview')return {ok:true,notifications:[],months:[],commission:{}};
 if(route==='/rest/v1/rpc/operator_signup_flow'||route==='/rest/v1/rpc/operator_owner_flow_events')return {ok:false};
 if(route==='/rest/v1/rpc/owner_capabilities')return {version:1,plan:'essential',staff_limit:1,per_day_hours:true};
 if(route.startsWith('/rest/v1/rpc/'))return {};
 if(route.startsWith('/rest/v1/'))return [];
 return {ok:false};
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture'),kind=url.pathname.startsWith('/auth/')||url.pathname.startsWith('/rest/')?'supabase':url.pathname.startsWith('/api/')?'vercel-api':'static';
 const request={path:url.pathname,method:req.method,kind,status:200};requests.push(request);
 // A runaway client can fail this bounded fixture, never issue a production call.
 if(requests.length>300){request.status=503;res.writeHead(503);return res.end('Request budget exceeded');}
 res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
 if(kind!=='static'){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(responseFor(url)));
 }
 try{
  const relative=url.pathname==='/'?'index.html':'.'+url.pathname;
  const built=path.resolve(dist,relative),legacy=path.resolve(root,relative);
  assert(built.startsWith(dist+path.sep));assert(legacy.startsWith(root+path.sep));
  let data;try{data=await readFile(built);}catch(error){if(url.pathname.startsWith('/assets/')||url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/operator.html')throw error;data=await readFile(legacy);}
  const extension=path.extname(built);
  // Change only the public API origin in this fixture. Production bytes stay untouched.
  if(extension==='.js')data=Buffer.from(data.toString().replaceAll(serviceURL,origin));
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'})[extension]||'application/octet-stream');
  res.setHeader('Cache-Control',extension==='.html'?'public, max-age=0, must-revalidate':/\.[a-f0-9]{8,64}\.(?:css|js)$/.test(built)?'public, max-age=31536000, immutable':/\.(?:js|css)$/.test(built)?'public, max-age=300':'public, max-age=86400');
  res.end(data);
 }catch{request.status=404;res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
const counts=rows=>({total:rows.length,static:rows.filter(row=>row.kind==='static').length,supabase:rows.filter(row=>row.kind==='supabase').length,vercelApi:rows.filter(row=>row.kind==='vercel-api').length});
async function phase(page,name,action){
 const before=requests.length;await action();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
 const rows=requests.slice(before),result={name,...counts(rows),requests:rows};phases.push(result);return result;
}
async function context(operator=false){
 const ctx=await browser.newContext({viewport:{width:1440,height:900}});
 if(operator)await ctx.addInitScript(()=>sessionStorage.setItem('jovabook-operator-auth-v1',JSON.stringify({access_token:'bundle-fixture-operator',refresh_token:'fixture',expires_at:Date.now()/1000+3600,user_id:'fixture-operator'})));
 const page=await ctx.newPage();page.setDefaultTimeout(7000);
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('request',request=>{const url=new URL(request.url());if(!['data:','blob:'].includes(url.protocol)&&url.origin!==origin)external.push(request.url());});
 return {ctx,page};
}
async function hardReload(ctx,page,ready){
 const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');
 try{await Promise.all([page.waitForNavigation({waitUntil:'load'}),cdp.send('Page.reload',{ignoreCache:true})]);await ready();}finally{await cdp.detach();}
}
try{
 await mkdir(output,{recursive:true});
 await test('Built owner shell loads within a bounded static request budget and preserves owner workflows',async()=>{
  const {ctx,page}=await context();try{
   const cold=await phase(page,'owner cold login',async()=>{await page.goto(origin+'/#login');await expect(page.locator('[data-form=login]')).toBeVisible();});
   assert(cold.static<=10,`Cold owner shell requested ${cold.static} static files, budget 10`);
   await phase(page,'owner explicit login',async()=>{await page.locator('[data-form=login] [name=email]').fill('owner@example.test');await page.locator('[data-form=login] [name=password]').fill('FixtureOnly2026');await page.locator('[data-form=login] button.primary').click();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#dashboard$/);});
   await page.goto(origin+'/#settings');await expect(page.locator('.bd-settings')).toBeVisible();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('[data-bd-open=information]').click();
   const form=page.locator('[data-form=settings]'),save=form.locator('[data-bd-save]'),name=form.locator('[name=name]'),original=await name.inputValue();
   await expect(name).toBeVisible();await expect(save).toBeDisabled();await name.fill(original+' edited');await expect(save).toBeEnabled();await name.fill(original);await expect(save).toBeDisabled();
   await page.goto(origin+'/#calendar');await expect(page.locator('.db-calendar-page')).toBeVisible();await expect(page.getByRole('region',{name:'Booking calendar'})).toBeVisible();
   await page.goto(origin+'/#dashboard');await expect(page.locator('.workspace')).toBeVisible();
   const warm=await phase(page,'owner warm returning session reload',async()=>{await page.reload();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#dashboard$/);});assert(warm.static<=2,`Warm owner reload requested ${warm.static} static files`);assert(warm.requests.filter(row=>row.kind==='static').every(row=>row.path==='/'||row.path.startsWith('/fonts/')),'Warm restore may load one previously unused font but must reuse cached script and style bundles');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jovabook-auth')).user.id),uid);
   const hard=await phase(page,'owner hard reload',()=>hardReload(ctx,page,()=>expect(page.locator('.workspace')).toBeVisible()));assert(hard.static<=10,`Hard owner reload requested ${hard.static} static files, budget 10`);
   const idle=await phase(page,'owner idle focus and visibility',()=>page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));}));assert.equal(idle.static,0);assert.equal(idle.vercelApi,0);assert.equal(idle.supabase,0);
   await page.screenshot({path:path.join(output,'owner-dashboard.png'),fullPage:true});
  }finally{await ctx.close();}
 });
 await test('Built Operator shell uses few static files, exact manual API reads, and no idle reads',async()=>{
  const {ctx,page}=await context(true);try{
   const ready=()=>expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
   const cold=await phase(page,'operator cold returning session',async()=>{await page.goto(origin+'/operator.html');await ready();});assert(cold.static<=8,`Cold operator requested ${cold.static} static files, budget 8`);assert.equal(cold.supabase,5);assert.equal(cold.vercelApi,0);
   const warm=await phase(page,'operator warm reload',async()=>{await page.reload();await ready();});assert(warm.static<=1);assert.equal(warm.supabase,5);assert.equal(warm.vercelApi,0);
   const hard=await phase(page,'operator hard reload',()=>hardReload(ctx,page,ready));assert(hard.static<=8);assert.equal(hard.supabase,5);assert.equal(hard.vercelApi,0);
   const refresh=await phase(page,'operator in-page Overview Refresh',async()=>{await page.getByRole('button',{name:'Refresh',exact:true}).click();await ready();});assert.equal(refresh.static,0);assert.equal(refresh.supabase,5);assert.equal(refresh.vercelApi,0);
   const notifications=await phase(page,'operator Notifications navigation',async()=>{await page.locator('nav [data-action=notifications]').click();await expect(page.getByRole('heading',{name:'Notifications',exact:true,level:1})).toBeVisible();});assert.equal(notifications.static,0);assert.equal(notifications.supabase,2);assert.equal(notifications.vercelApi,0);
   const notificationRefresh=await phase(page,'operator Notifications Refresh',async()=>{await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('heading',{name:'Notifications',exact:true,level:1})).toBeVisible();});assert.equal(notificationRefresh.static,0);assert.equal(notificationRefresh.supabase,2);assert.equal(notificationRefresh.vercelApi,0);
   const idle=await phase(page,'operator idle focus and visibility',()=>page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));}));assert.equal(idle.total,0);
   await page.screenshot({path:path.join(output,'operator-notifications.png'),fullPage:true});
  }finally{await ctx.close();}
 });
 assert.deepEqual(errors,[],'Built pages must not throw runtime errors');assert.deepEqual(external,[],'All browser requests must stay inside the local fixture');assert(requests.length<300);
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
 await writeFile(path.join(output,'request-counts.json'),JSON.stringify({note:'Local built-output tests, all APIs mocked. Static server hits model CDN requests; Supabase and Vercel API requests are reported separately. This is not production usage evidence.',phases,errors,external},null,2));
 console.log(JSON.stringify(phases.map(({requests,...result})=>result)));
}
