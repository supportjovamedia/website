/** Actual app, synthetic owner/session, entirely intercepted Auth and account APIs. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./billing-access-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
const boundary=source.indexOf('await mkdir(out,{recursive:true});try{');
if(boundary<0)throw Error('Billing fixture boundary changed');
source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href)).replace('../output/billing-access-','../output/owner-session-restoration-');
const checks=String.raw`
async function savedSession(ctx){await ctx.addInitScript(({uid})=>{
 if(localStorage.getItem('fixture-auth-seeded'))return;
 localStorage.setItem('fixture-auth-seeded','1');
 localStorage.setItem('jovabook-auth',JSON.stringify({access_token:'fixture-saved-owner',refresh_token:'fixture-saved-refresh',expires_at:Date.now()/1000+3600,user:{id:uid}}));
}, {uid});}
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
await mkdir(out,{recursive:true});try{
await test('Fresh saved session verifies before display, then survives refresh and a new tab',async()=>{
 const {ctx,page,mock}=await context();const gate=deferred();mock.access=status('active','paid');mock.delay=gate.promise;await savedSession(ctx);
 try{
  await page.goto(base+'/#login');await expect.poll(()=>mock.calls.filter(path=>path==='/api/jovabook/billing/status').length).toBeGreaterThan(0);
  await expect(page.locator('.workspace')).toHaveCount(0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),null);
  assert(!mock.calls.some(path=>/^\/rest\/v1\/(salons|categories|staff|services|customers|bookings|email_log|payments)$/.test(path)),'No private reads before access verification');
  gate.resolve();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#dashboard$/);assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),'1');
  await page.reload();await expect(page.locator('.workspace')).toBeVisible();assert(await page.evaluate(()=>!!localStorage.getItem('jovabook-auth')));
  const second=await ctx.newPage();await second.goto(base+'/#calendar');await expect(second.locator('.workspace')).toBeVisible();await expect(second).toHaveURL(/#calendar$/);
  assert.equal(mock.calls.filter(path=>!path.endsWith('/report_owner_activity'))[0],'/api/jovabook/billing/status');assert(mock.calls.includes('/rest/v1/bookings'));
 }finally{gate.resolve();await ctx.close();}
});
await test('Same-owner diary writes and rotated tokens during startup do not log the owner out',async()=>{
 const {ctx,page,mock}=await context();const gate=deferred();mock.access=status('active','paid');mock.delay=gate.promise;await savedSession(ctx);
 try{
  await page.goto(base+'/#bookings');await expect.poll(()=>mock.calls.length).toBeGreaterThan(0);
  const other=await ctx.newPage();await other.goto(base+'/config.js');await other.evaluate(()=>{
   localStorage.setItem('jovabook-essential-demo-v2',JSON.stringify({salons:[]}));
   const auth=JSON.parse(localStorage.getItem('jovabook-auth'));auth.access_token='fixture-rotated-same-owner';auth.refresh_token='fixture-rotated-refresh';localStorage.setItem('jovabook-auth',JSON.stringify(auth));
  });
  gate.resolve();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#bookings$/);assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),'1');
 }finally{gate.resolve();await ctx.close();}
});
await test('Two visible owner tabs and a hundred cache broadcasts cause no idle API echo',async()=>{
 const {ctx,page,mock}=await context();mock.access=status('active','paid');await savedSession(ctx);
 try{
  await page.goto(base+'/#dashboard');await expect(page.locator('.workspace')).toBeVisible();const second=await ctx.newPage();await second.goto(base+'/#calendar');await expect(second.locator('.workspace')).toBeVisible();
  assert.equal(await page.evaluate(()=>document.visibilityState),'visible');assert.equal(await second.evaluate(()=>document.visibilityState),'visible');
  await page.waitForTimeout(150);const before=mock.calls.filter(path=>path==='/api/jovabook/billing/status').length;
  await second.evaluate(()=>{for(let index=0;index<100;index++)localStorage.setItem('jovabook-essential-demo-v2',JSON.stringify({cache:index}));});
  await page.waitForTimeout(1800);assert.equal(mock.calls.filter(path=>path==='/api/jovabook/billing/status').length,before,'Local cache changes cannot trigger subscription or diary API calls');await expect(page.locator('.workspace')).toBeVisible();await expect(second.locator('.workspace')).toBeVisible();
 }finally{await ctx.close();}
});
await test('Idle and visibility refresh notifications only, while manual reload verifies the diary',async()=>{
 const {ctx,page,mock}=await context();mock.access=status('active','paid');await savedSession(ctx);
 await ctx.addInitScript(()=>{const native=window.setInterval;window.setInterval=(callback,delay,...args)=>{if(delay===60000)window.fixtureNotificationTick=callback;return native(callback,delay,...args);};});
 const dataPaths=path=>path==='/api/jovabook/billing/status'||/^\/rest\/v1\/(salons|categories|staff|services|customers|bookings|payments)$/.test(path);
 try{
  await page.goto(base+'/#dashboard');await expect(page.locator('.workspace')).toBeVisible();const before=mock.calls.filter(dataPaths).length,emailBefore=mock.calls.filter(path=>path==='/rest/v1/email_log').length;
  await page.evaluate(()=>{window.fixtureDashboardNode=document.querySelector('.rf-dashboard');const clock=Date.now;Date.now=()=>clock()+20000;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));if(typeof window.fixtureNotificationTick!=='function')throw Error('Missing notification-only timer');for(let index=0;index<100;index++)window.fixtureNotificationTick();});
  await expect.poll(()=>mock.calls.filter(path=>path==='/rest/v1/email_log').length).toBe(emailBefore+1);await page.waitForTimeout(150);
  assert.equal(mock.calls.filter(dataPaths).length,before,'Idle/focus/visibility/ticks cannot refresh diary or billing');assert.equal(await page.evaluate(()=>window.fixtureDashboardNode===document.querySelector('.rf-dashboard')),true,'Notifications must not re-render the dashboard');
  await page.reload();await expect(page.locator('.workspace')).toBeVisible();assert(mock.calls.filter(dataPaths).length>before,'Manual reload still re-verifies and reads the owner diary');
 }finally{await ctx.close();}
});
await test('Transient access outage retains credentials and Try again re-verifies without a login',async()=>{
 const {ctx,page,mock}=await context();mock.access=status('active','paid');mock.fail=true;await savedSession(ctx);
 try{
  await page.goto(base+'/#calendar');await expect(page.getByRole('heading',{name:'We couldn’t load your business',exact:true})).toBeVisible();await expect(page.locator('.workspace')).toHaveCount(0);
  assert(await page.evaluate(()=>!!localStorage.getItem('jovabook-auth')));assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),null);
  mock.fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#calendar$/);
 }finally{await ctx.close();}
});
await test('Actual account change, revoked access and removed credentials fail closed',async()=>{
 for(const kind of ['changed','revoked','removed']){
  const {ctx,page,mock}=await context();const gate=deferred();mock.access=status('active','paid');await savedSession(ctx);
  try{
   if(kind==='revoked')await ctx.route('**/api/jovabook/billing/status',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,message:'Session revoked'})}));
   if(kind==='changed')mock.delay=gate.promise;
   await page.goto(base+'/#dashboard');
   if(kind!=='revoked'){
    if(kind==='removed')await expect(page.locator('.workspace')).toBeVisible();else await expect.poll(()=>mock.calls.length).toBeGreaterThan(0);
    const other=await ctx.newPage();await other.goto(base+'/config.js');await other.evaluate(kind=>{if(kind==='removed')localStorage.removeItem('jovabook-auth');else{const auth=JSON.parse(localStorage.getItem('jovabook-auth'));auth.user.id='40000000-0000-4000-8000-000000000002';localStorage.setItem('jovabook-auth',JSON.stringify(auth));}},kind);
   }
   gate.resolve();await expect(page.locator('[data-form=login]')).toBeVisible();await expect(page.locator('.workspace')).toHaveCount(0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),null);
  }finally{gate.resolve();await ctx.close();}
 }
});
await test('Saved owner credentials do not take over a public customer route',async()=>{
 const {ctx,page,mock}=await context();mock.access=status('active','paid');await savedSession(ctx);
 try{
  await page.goto(base+'/?portal=customer&salon=fixture-public#customer/login');await expect(page.locator('.workspace')).toHaveCount(0);await expect(page).toHaveURL(/#customer\/login$/);assert.equal(mock.calls.filter(path=>path==='/api/jovabook/billing/status').length,0);
 }finally{await ctx.close();}
});
await test('Google native verification and subscription outages retry without another OAuth callback',async()=>{
 for(const stage of ['verify_session','account_access']){
  const {ctx,page,mock}=await context();mock.access=status('active','paid');mock.fail=stage==='account_access';let nativeCalls=0;
  await ctx.route('**/google-auth.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.JovaGoogleAuth={callback:async()=>{window.fixtureGoogleCallbacks=(window.fixtureGoogleCallbacks||0)+1;return {handled:true,ok:true,session:{access_token:"fixture-google-owner",refresh_token:"fixture-google-refresh",expires_at:Date.now()/1000+3600}};},enabled:()=>true,button:()=>""};'}));
  await ctx.route('**/auth/v1/user',route=>{nativeCalls++;if(stage==='verify_session'&&nativeCalls===1)return route.abort('connectionfailed');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:uid,email:'owner@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Fixture Owner'}})});});
  try{
   await page.goto(base+'/?portal=owner#login');await expect(page.getByRole('heading',{name:'We couldn’t load your business',exact:true})).toBeVisible();await expect(page.locator('.workspace')).toHaveCount(0);
   assert.equal(await page.evaluate(()=>!!localStorage.getItem('jovabook-auth')),stage==='account_access');assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-owner')),null);
   mock.fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.workspace')).toBeVisible();await expect(page).toHaveURL(/#dashboard$/);assert.equal(await page.evaluate(()=>window.fixtureGoogleCallbacks),1);assert.equal(nativeCalls,2);
  }finally{await ctx.close();}
 }
});
assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.tests.filter(row=>row.passed).length,failed:report.tests.filter(row=>!row.passed).length,errors:report.errors.length}));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
