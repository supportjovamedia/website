/** Built production HTML and real auth/onboarding controllers, synthetic network only. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./billing-access-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
const boundary=source.indexOf('await mkdir(out,{recursive:true});try{');
if(boundary<0)throw Error('Billing fixture boundary changed');
source=source.slice(0,boundary).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href)).replace('../output/billing-access-','../output/owner-signup-workflows-');
const buildURL=new URL('../build-assets.mjs',import.meta.url).href;
source=source.replace('const server=http.createServer',`const {bundlePage}=await import(${JSON.stringify(buildURL)});const bundled=await bundlePage({page:'owner',html:await readFile(path.join(root,'index.html'),'utf8'),readSource:file=>readFile(path.join(root,file),'utf8')});const generated=new Map([['/',bundled.html],...bundled.assets.map(asset=>[asset.url,asset.body])]);\nconst server=http.createServer`).replace('const data=await readFile(file);','const data=generated.get(p)??await readFile(file);');
const checks=String.raw`
async function signupContext(kind){
 const {ctx,page}=await context(),state={created:false,profileComplete:false,password:null,data:{},steps:{},calls:[],createCalls:0,failCreate:true,release:null};
 if(kind==='google')await ctx.addInitScript(()=>{sessionStorage.setItem('jovabook-google-start',JSON.stringify({started:Date.now()}));window.supabase={createClient:()=>({auth:{exchangeCodeForSession:async code=>{window.fixtureGoogleCode=code;window.fixtureGoogleExchanges=(window.fixtureGoogleExchanges||0)+1;return {data:{session:{access_token:'fixture-google',refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600}}};}}})};});
 await ctx.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin===base&&!url.pathname.startsWith('/api/'))return route.fallback();if(request.method()==='OPTIONS')return route.fallback();const body=request.postDataJSON?.()||{},send=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(data)});state.calls.push({path:url.pathname,method:request.method(),body});
  if(url.pathname.endsWith('/region'))return send({allowed:true,currency:'GBP'});
  if(url.pathname.endsWith('/reserve_owner_verification'))return send({ok:true,remaining:2});
  if(url.pathname==='/auth/v1/signup')return send({user:{id:uid,identities:[{identity_id:'fixture'}]}});
  if(url.pathname==='/auth/v1/verify')return send({access_token:'fixture-email',refresh_token:'fixture-refresh',expires_in:3600});
  const user=()=>({id:uid,email:'owner@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Fixture Owner',first_name:'Fixture',last_name:'Owner',...(kind==='email'?{email_first:true,email_first_profile_complete:state.profileComplete}:{})}});
  if(url.pathname==='/auth/v1/recover')return send({});
  if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
   if(!state.password||body.password!==state.password)return send({error_code:'invalid_credentials'},400);
   return send({access_token:'fixture-owner',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:user()});
  }
  if(url.pathname==='/auth/v1/user'){
   if(request.method()==='PUT'){state.password=body.password;if(body.data?.email_first_profile_complete)state.profileComplete=true;}
   return send(user());
  }
  if(url.pathname==='/api/jovabook/billing/status')return send(state.created?{...status('setup','business_setup'),business:{id:sid,name:'Workflow Studio',slug:'workflow-studio',plan:'essential',status:'setup'}}:{ok:true,access:'no_business',no_business:true,business:null});
  if(url.pathname.endsWith('/owner_onboarding_progress')){const step=body.p_step;if(!['read','entry'].includes(step)){Object.assign(state.data,body.p_values);state.steps[step]=true;}return send({ok:true,email:'owner@example.test',data:state.data,steps:state.steps,business_id:state.created?sid:null});}
  if(url.pathname.endsWith('/create_business_for_existing_user')){state.createCalls++;if(state.createCalls===1)await new Promise(resolve=>{state.release=resolve;});if(state.failCreate)return send({ok:false,message:'Temporary setup failure'},503);state.created=true;return send({ok:true,salon_id:sid});}
  return route.fallback();
 });return {ctx,page,state};
}
async function profile(page){const form=page.locator('[data-form=owner-onboarding][data-stage=profile]');await expect(form).toBeVisible();await form.locator('[name=first_name]').fill('Fixture');await form.locator('[name=last_name]').fill('Owner');if(await form.locator('[name=password]').count())await form.locator('[name=password]').fill('FixtureOnly2026');await form.locator('[name=legal_accepted]').check();await form.locator('button.primary').click();await expect(page.locator('[data-form=owner-onboarding][data-stage=business]')).toBeVisible();}
async function businessWithRetry(page,state){const form=page.locator('[data-form=owner-onboarding][data-stage=business]');await expect(form.locator('.ob-address span')).toHaveText('jovamedia.com/book/');await page.setViewportSize({width:360,height:800});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await form.locator('[name=business_name]').fill('Workflow Studio');await expect(form.locator('[name=booking_slug]')).toHaveValue('workflow-studio');await form.locator('button.primary').click();await expect.poll(()=>state.createCalls).toBe(1);await expect(form.locator('button.primary')).toBeDisabled();await expect(form.locator('button.primary')).toHaveText('Saving...');await expect(form.locator('.df-save-indicator,.df-save-status,.df-save-bar')).toHaveCount(0);state.release();await expect(form.locator('.ob-error')).not.toBeEmpty();await expect(form.locator('button.primary')).toBeEnabled();await expect(form.locator('button.primary')).toHaveText('Continue');state.failCreate=false;await form.locator('button.primary').click();const category=page.locator('[data-form=owner-onboarding][data-stage=category]');await expect(category).toBeVisible();await expect(category.locator('button.primary')).toBeEnabled();await expect(category.locator('button.primary')).toHaveText('Continue');await expect(category.locator('.df-save-indicator,.df-save-status,.df-save-bar')).toHaveCount(0);assert.equal(state.createCalls,2);}
await mkdir(out,{recursive:true});try{
await test('Built email signup verifies code, sets profile password, and business Continue recovers from failure',async()=>{
 const {ctx,page,state}=await signupContext('email');try{await page.goto(base+'/?portal=owner#signup');const email=page.locator('[data-form=owner-onboarding][data-stage=email]');await email.locator('[name=email]').fill('owner@example.test');await email.locator('button.primary').click();const code=page.locator('[data-form=owner-onboarding][data-stage=check-email]');await expect(code).toBeVisible();await code.locator('[data-code-digit="0"]').fill('123456');await code.locator('button.primary').click();await profile(page);await businessWithRetry(page,state);assert.equal(state.calls.filter(call=>call.path==='/auth/v1/verify').length,1);assert(state.calls.some(call=>call.path==='/auth/v1/user'&&call.method==='PUT'&&call.body.password==='FixtureOnly2026'));assert(state.calls.filter(call=>call.path.endsWith('/owner_onboarding_progress')).every(call=>!JSON.stringify(call.body).includes('FixtureOnly2026')));assert.equal(await page.evaluate(()=>!!localStorage.getItem('jovabook-auth')),true);
 }finally{state.release?.();await ctx.close();}
});
await test('Built Google callback consumes same-tab code once and reaches category after retrying business creation',async()=>{
 const {ctx,page,state}=await signupContext('google');try{await page.goto(base+'/?portal=owner&code=synthetic-google-code#login');await profile(page);await businessWithRetry(page,state);assert.equal(await page.evaluate(()=>window.fixtureGoogleExchanges),1);assert.equal(await page.evaluate(()=>sessionStorage.getItem('jovabook-google-start')),null);assert(!page.url().includes('synthetic-google-code'));assert.equal(state.calls.filter(call=>call.path==='/auth/v1/signup'||call.path==='/auth/v1/verify').length,0);assert.equal(await page.evaluate(()=>!!localStorage.getItem('jovabook-auth')),true);
 }finally{state.release?.();await ctx.close();}
});
await test('A verified owner without a password can recover and resume on a fresh browser',async()=>{
 const {ctx,page,state}=await signupContext('email');try{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?portal=owner#login');
  await page.getByRole('link',{name:'Set or reset your password'}).click();
  const requestForm=page.locator('[data-form=forgot]');
  await requestForm.locator('[name=email]').fill('owner@example.test');
  await requestForm.getByRole('button',{name:'Send password link'}).click();
  await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();
  assert.equal(state.calls.filter(call=>call.path==='/auth/v1/recover').length,1);
  const jwt=Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
  await page.goto(base+'/?portal=owner#access_token='+jwt+'&type=recovery');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Choose a password',exact:true})).toBeVisible();
  const reset=page.locator('[data-form=reset]');
  await reset.locator('[name=password]').fill('RecoveredOwner2026');
  await reset.locator('[name=confirm]').fill('RecoveredOwner2026');
  await reset.getByRole('button',{name:'Save new password'}).click();
  const login=page.locator('[data-form=login]');
  await expect(login).toBeVisible();
  await login.locator('[name=email]').fill('owner@example.test');
  await login.locator('[name=password]').fill('RecoveredOwner2026');
  await login.getByRole('button',{name:'Sign in',exact:true}).click();
  const details=page.locator('[data-form=owner-onboarding][data-stage=profile]');
  await expect(details).toBeVisible();
  await expect(details.locator('[name=password]')).toHaveCount(0);
  await page.reload();
  await expect(details).toBeVisible();
  await expect(details.locator('[name=password]')).toHaveCount(0);
  await profile(page);
  assert.equal(state.calls.filter(call=>call.path==='/auth/v1/user'&&call.method==='PUT').length,1);
  assert.equal(state.calls.filter(call=>call.path==='/auth/v1/signup'||call.path==='/auth/v1/verify').length,0);
  assert.equal(state.createCalls,0);
 }finally{await ctx.close();}
});
assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.tests.filter(row=>row.passed).length,failed:report.tests.filter(row=>!row.passed).length,errors:report.errors.length}));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
