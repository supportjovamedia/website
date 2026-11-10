/* Actual Google UI and callback module; fake SDK, fake clock, no live identity calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const source=await readFile(new URL('../google-auth.js',import.meta.url),'utf8');
const origin='http://127.0.0.1:41999';
const sdk=`window.supabase={createClient:(url,key,options)=>({auth:{
 signInWithOAuth:async()=>{options.auth.storage.setItem('jovabook-google-pkce-code-verifier','fixture-verifier');return {data:{url:location.origin+'/auth/v1/authorize'}};},
 exchangeCodeForSession:async code=>{window.fixtureExchanges=(window.fixtureExchanges||[]).concat(code);if(window.fixtureHoldExchange)return new Promise(resolve=>{window.fixtureResolveExchange=()=>resolve({data:{session:{access_token:'fixture-token',refresh_token:'fixture-refresh'}}});});return {data:{session:{access_token:'fixture-token',refresh_token:'fixture-refresh'}}};}
}})};`;
const html=`<!doctype html><html><head><meta charset="utf-8"><script>window.JOVA_GOOGLE_AUTH_ENABLED=true;window.JOVA_SUPABASE={url:location.origin,key:'fixture'};</script></head><body><div class="auth-card"><p class="error" role="alert"></p><button type="button" data-google-signin>Continue with Google</button></div><script src="/google-auth.js"></script></body></html>`;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
async function fixture(first='pending',callback=false){
 const ctx=await browser.newContext(),page=await ctx.newPage(),requests=[],errors=[];let scriptCount=0;
 page.on('pageerror',error=>errors.push(String(error)));
 await page.clock.install();
 if(callback)await ctx.addInitScript(()=>{if(sessionStorage.getItem('fixture-seeded'))return;sessionStorage.setItem('fixture-seeded','1');sessionStorage.setItem('jovabook-google-start',JSON.stringify({started:Date.now()}));sessionStorage.setItem('jovabook-google-pkce-code-verifier','fixture-original-verifier');});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());requests.push(url.pathname);assert.equal(url.origin,origin,'Only synthetic localhost requests are allowed');
  if(url.pathname==='/google-auth.js')return route.fulfill({contentType:'text/javascript',body:source});
  if(url.pathname==='/vendor/supabase-2.117.3.js'){
   scriptCount++;
   if(scriptCount===1&&first==='pending')return;
   if(scriptCount===1&&first==='error')return route.fulfill({status:503,body:''});
   return route.fulfill({contentType:'text/javascript',body:sdk});
  }
  if(url.pathname==='/auth/v1/authorize')return route.fulfill({contentType:'text/html',body:'<h1>Mock Google authorization</h1>'});
  return route.fulfill({contentType:'text/html',body:html});
 });
 await page.goto(origin+(callback?'/?portal=owner&code=fixture-code#login':'/'));
 return {ctx,page,requests,errors,get scriptCount(){return scriptCount;}};
}
try{
 await test('Google button download timeout or error restores the button and a fresh SDK attempt can authorize',async()=>{
  for(const failure of ['pending','error']){
   const h=await fixture(failure);try{
    const button=h.page.getByRole('button',{name:'Continue with Google'});await button.click();
    await expect.poll(()=>h.scriptCount).toBe(1);
    if(failure==='pending'){
     await h.page.evaluate(()=>{window.fixtureLateLoad=document.querySelector('script[src^="/vendor/"]').onload;});
     await expect(button).toBeDisabled();await h.page.clock.fastForward(9001);
    }
    await expect(button).toBeEnabled();await expect(h.page.getByRole('alert')).toContainText(/could not load|too long to load/);
    assert.equal(await h.page.locator('script[src^="/vendor/"]').count(),0,'Failed loader removes its script');
    if(failure==='pending')await h.page.evaluate(()=>window.fixtureLateLoad());
    assert.equal(h.requests.filter(path=>path==='/auth/v1/authorize').length,0,'Late first-load callback cannot authorize');
    await button.click();await expect(h.page.getByRole('heading',{name:'Mock Google authorization'})).toBeVisible();
    assert.equal(h.scriptCount,2);assert.equal(h.requests.filter(path=>path==='/auth/v1/authorize').length,1);assert.deepEqual(h.errors,[]);
   }finally{await h.ctx.close();}
  }
 });
 await test('Callback SDK timeout preserves the unexchanged code and PKCE state for an explicit reload retry',async()=>{
  const h=await fixture('pending',true);try{
   await h.page.evaluate(()=>{window.fixtureCallback=window.JovaGoogleAuth.callback();});await expect.poll(()=>h.scriptCount).toBe(1);
   await h.page.clock.fastForward(9001);const timedOut=await h.page.evaluate(()=>window.fixtureCallback);
   assert.equal(timedOut.ok,false);assert.equal(timedOut.retryable,true);assert.match(timedOut.message,/Reload this page/);
   assert.match(h.page.url(),/code=fixture-code/);assert.equal(await h.page.evaluate(()=>sessionStorage.getItem('jovabook-google-pkce-code-verifier')),'fixture-original-verifier');assert.equal(await h.page.evaluate(()=>window.fixtureExchanges?.length||0),0);
   await h.page.reload();const result=await h.page.evaluate(()=>window.JovaGoogleAuth.callback());assert.equal(result.ok,true);assert.equal(h.scriptCount,2);
   assert.deepEqual(await h.page.evaluate(()=>window.fixtureExchanges),['fixture-code']);assert(!h.page.url().includes('code='));
   assert.equal(await h.page.evaluate(()=>sessionStorage.getItem('jovabook-google-start')),null);assert.equal(await h.page.evaluate(()=>sessionStorage.getItem('jovabook-google-pkce-code-verifier')),null);assert.deepEqual(h.errors,[]);
  }finally{await h.ctx.close();}
 });
 await test('Successful SDK loading clears its deadline and never times out or retries an in-flight OAuth exchange',async()=>{
  const h=await fixture('success',true);try{
   await h.page.evaluate(()=>{window.fixtureHoldExchange=true;window.fixtureCallback=window.JovaGoogleAuth.callback().then(result=>{window.fixtureResult=result;return result;});});
   await expect.poll(()=>h.page.evaluate(()=>window.fixtureExchanges?.length||0)).toBe(1);assert(!h.page.url().includes('code='),'Code is removed only when exchange actually begins');
   await h.page.clock.fastForward(30000);assert.equal(await h.page.evaluate(()=>window.fixtureResult),undefined);assert.equal(h.scriptCount,1);assert.deepEqual(await h.page.evaluate(()=>window.fixtureExchanges),['fixture-code']);
   await h.page.evaluate(()=>window.fixtureResolveExchange());assert.equal((await h.page.evaluate(()=>window.fixtureCallback)).ok,true);assert.deepEqual(h.errors,[]);
  }finally{await h.ctx.close();}
 });
}finally{await browser.close();}
