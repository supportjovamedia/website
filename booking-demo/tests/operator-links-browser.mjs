/* Actual Operator Links controls, with local assets and fully intercepted APIs. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,expect}=require('@playwright/test');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(file.startsWith(root+path.sep));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,backend='https://backend.example.test';
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
const builtins=()=>['instagram','nextdoor','whatsapp'].map((code,i)=>({code,platform:code,medium:code==='whatsapp'?'message':'social',campaign:'jovabook_launch',content:'introduction',destination:'/jovabook',builtin:true,unique_today:i===0?1:0,unique_available:true,clicks:i===0?7:0,bots:i===0?2:0,last:i===0?'2026-11-03T12:00:00Z':null,stats_available:true}));
async function make(width=1440,role='operator'){
 const context=await browser.newContext({viewport:{width,height:950}}),state={role,links:builtins(),available:true,createError:false,status:200,hold:null,calls:[],errors:[]};
 await context.addInitScript(()=>{sessionStorage.setItem('jovabook-operator-auth-v1',JSON.stringify({access_token:'operator-fixture',expires_at:Date.now()/1000+3600,user_id:'operator'}));localStorage.setItem('jovabook-auth','owner unchanged');sessionStorage.setItem('jovabook-customer-auth-v1:test','customer unchanged');window.copied=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{if(window.copyBlocked)throw Error('blocked');window.copied.push(value);}}});});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.origin===origin&&url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.JOVA_SUPABASE={url:"'+backend+'",key:"test-public"}'});
  if(url.origin===origin&&url.pathname==='/api/jovabook/operator/links'){
   assert.equal(req.headers().authorization,'Bearer operator-fixture');const data=req.postDataJSON();state.calls.push(data);
   if(state.hold){const hold=state.hold;state.hold=null;await hold;}
   if(state.status!==200)return reply({ok:false},state.status);
   if(data.action==='create'){if(state.createError)return reply({ok:false,message:'That link code already exists.'},409);state.links.push({...data.link,clicks:0,bots:0,last:null,stats_available:true});}
   else assert.equal(data.action,'list');
   return reply({ok:true,available:state.available,links:state.links.map(l=>state.available?l:{...l,clicks:null,bots:null,last:null,stats_available:false}),base:'https://www.jovamedia.com/go/'});
  }
  if(url.origin===origin&&req.method()==='GET')return route.continue();
  if(url.origin!==backend)throw Error('Unexpected external request: '+req.url());
  if(url.pathname.endsWith('/rpc/portal_identity'))return reply({ok:true,role:state.role});
  if(url.pathname.endsWith('/rpc/operator_businesses'))return reply({ok:true,total:0,businesses:[]});
  if(url.pathname.endsWith('/rpc/operator_overview'))return reply({ok:true,total:0,months:[],notifications:[],commission:{}});
  if(url.pathname==='/auth/v1/logout')return reply({});
  throw Error('Unexpected API: '+req.url());
 });
 const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>state.errors.push(String(e)));await page.goto(origin+'/operator.html');
 if(role==='operator'){await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();await page.getByRole('button',{name:'Links',exact:true}).click();await expect(page.locator('.op-link-card')).toHaveCount(3);}
 return {page,context,state};
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
async function check(name,fn){await fn();console.log('PASS '+name);}
try{
 await check('Desktop and mobile show three campaigns, honest counts, safe GA4 link, usable copy controls and no overflow',async()=>{for(const width of [1440,768,390,320]){const {page,context,state}=await make(width);try{
  if(process.env.OP_LINKS_CAPTURE&&[1440,390].includes(width)){const out=path.resolve(root,'../output/operator-links');await mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,width===1440?'desktop.png':'mobile.png'),fullPage:true});}
  for(const code of ['instagram','nextdoor','whatsapp']){const button=page.getByRole('button',{name:'Copy '+code+' link',exact:true});assert((await button.boundingBox()).height>=44);await button.click();await expect(button).toHaveText('Copied');}
  assert.deepEqual(await page.evaluate(()=>window.copied),['instagram','nextdoor','whatsapp'].map(c=>'https://www.jovamedia.com/go/'+c));
  await expect(page.locator('.op-link-card').first()).toContainText('7');await expect(page.locator('.op-link-card').first()).toContainText('Detected previews');await expect(page.locator('.op-link-card').nth(1)).toContainText('No clicks yet');
  await expect(page.locator('.op-link-card').first().locator('.op-link-unique dd')).toHaveText('1');await expect(page.locator('.op-main')).toContainText('Estimated unique opens today');
  const ga=page.getByRole('link',{name:'Open GA4 audience report (new tab)'});await expect(ga).toHaveAttribute('target','_blank');await expect(ga).toHaveAttribute('rel','noopener noreferrer');await expect(ga).toHaveAttribute('href',/p558337460/);
  state.available=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.op-link-card').first().locator('dd')).toHaveText(['Unavailable','Unavailable','Unavailable','Unavailable']);
  await noOverflow(page);assert.deepEqual(state.errors,[]);
 }finally{await context.close();}}});
 await check('Creation validates input, retains failed draft, retries and escapes labels; copy denial is recoverable',async()=>{const {page,context,state}=await make();try{
  await page.getByRole('button',{name:'Create link',exact:true}).click();assert.equal(state.calls.filter(c=>c.action==='create').length,0);
  await page.getByLabel('Short code',{exact:true}).fill('campaign-test');await page.getByLabel('Source',{exact:true}).fill('email');await page.getByLabel('Content or batch',{exact:true}).fill('barbers');state.createError=true;
  await page.getByRole('button',{name:'Create link',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'That link code already exists.'})).toBeVisible();await expect(page.getByLabel('Short code',{exact:true})).toHaveValue('campaign-test');await expect(page.getByLabel('Content or batch',{exact:true})).toHaveValue('barbers');
  state.createError=false;await page.getByRole('button',{name:'Create link',exact:true}).click();await expect(page.locator('.op-link-card')).toHaveCount(4);await expect(page.getByRole('status')).toHaveText('Link campaign-test created.');
  await page.evaluate(()=>window.copyBlocked=true);const copy=page.getByRole('button',{name:'Copy campaign-test link',exact:true});await copy.click();await expect(copy).toHaveText('Copy failed');await expect(copy).toBeEnabled();await page.evaluate(()=>window.copyBlocked=false);await copy.click();await expect(copy).toHaveText('Copied');state.links.at(-1).content='<script>bad()</script>';await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.op-link-card').last()).toContainText('<script>bad()</script>');assert.equal(await page.locator('.op-link-card script').count(),0);assert.deepEqual(state.errors,[]);
 }finally{await context.close();}});
 await check('Failed list retries; authentication failures log out and late responses cannot restore private content',async()=>{const {page,context,state}=await make();try{
  state.status=503;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Links could not be loaded');state.status=200;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.op-link-card')).toHaveCount(3);
  state.status=403;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('heading',{name:'JovaMedia back office',exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-operator-auth-v1')),null);
 }finally{await context.close();}
 const second=await make();try{let release;second.state.hold=new Promise(r=>release=r);const before=second.state.calls.length;await second.page.getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(()=>second.state.calls.length).toBe(before+1);await second.page.getByRole('button',{name:'Log out',exact:true}).click();release();await expect(second.page.getByRole('heading',{name:'JovaMedia back office',exact:true})).toBeVisible();await second.page.waitForTimeout(100);assert.equal(await second.page.locator('.op-link-card').count(),0);assert.equal(await second.page.evaluate(()=>localStorage.getItem('jovabook-auth')),'owner unchanged');assert.equal(await second.page.evaluate(()=>sessionStorage.getItem('jovabook-customer-auth-v1:test')),'customer unchanged');}finally{await second.context.close();}});
 await check('Business and customer accounts cannot reach the Links tab or request its API',async()=>{for(const role of ['business','customer','unassigned']){const {page,context,state}=await make(390,role);try{await expect(page.getByRole('alert')).toContainText('does not have back-office access');assert.equal(state.calls.length,0);await expect(page.getByRole('button',{name:'Links',exact:true})).toHaveCount(0);}finally{await context.close();}}});
}finally{await browser.close();await new Promise(r=>server.close(r));}
