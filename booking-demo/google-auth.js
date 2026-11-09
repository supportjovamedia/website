/* Google uses Supabase's PKCE implementation. Its client is loaded only on demand. */
(() => {
 'use strict';
 const marker='jovabook-google-start',storageKey='jovabook-google-pkce';let clientPromise;
 const enabled=()=>window.JOVA_GOOGLE_AUTH_ENABLED===true;
 const clean=()=>{try{sessionStorage.removeItem(marker);sessionStorage.removeItem(storageKey+'-code-verifier');}catch{}};
 function client(){
  if(!clientPromise)clientPromise=new Promise((resolve,reject)=>{
   const ready=()=>{const cfg=window.JOVA_SUPABASE;if(!cfg?.url||!cfg?.key||!window.supabase?.createClient){reject(Error('Google sign-in is unavailable. Please sign in with email.'));return;}
    // Keep the one-use verifier in this tab. The app owns its verified session.
    const storage={getItem:key=>key.includes('code-verifier')?sessionStorage.getItem(key):null,setItem:(key,value)=>{if(key.includes('code-verifier'))sessionStorage.setItem(key,value);},removeItem:key=>{if(key.includes('code-verifier'))sessionStorage.removeItem(key);}};
    resolve(window.supabase.createClient(cfg.url,cfg.key,{auth:{flowType:'pkce',autoRefreshToken:false,detectSessionInUrl:false,persistSession:true,storageKey,storage}}));};
   if(window.supabase?.createClient){ready();return;}const script=document.createElement('script');script.src='/vendor/supabase-2.117.3.js';script.onload=ready;script.onerror=()=>{clientPromise=null;reject(Error('Google sign-in could not load. Please try again.'));};document.head.append(script);
  });return clientPromise;
 }
 function button(){return enabled()?'<button type="button" class="ob-google" data-google-signin><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.04v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.66.11-1.31.31-1.92V7.49H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.52l2.88-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>Continue with Google</button>':'';}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-google-signin]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(!enabled()||button.disabled)return;button.disabled=true;
  try{const origin=location.origin;if(origin!=='https://book.jovamedia.com'&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))throw Error('Open Google sign-in at book.jovamedia.com.');
   const sdk=await client();sessionStorage.setItem(marker,JSON.stringify({started:Date.now()}));
   const result=await sdk.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/?portal=owner#login',scopes:'openid email profile',queryParams:{prompt:'select_account'},skipBrowserRedirect:true}});
   if(result.error||!result.data?.url)throw Error('Google sign-in could not start. Please try again.');
   const target=new URL(result.data.url),expected=new URL(window.JOVA_SUPABASE.url);if(target.origin!==expected.origin||target.pathname!=='/auth/v1/authorize')throw Error('Google sign-in could not be verified.');location.assign(target.href);
  }catch(error){clean();button.disabled=false;let alert=document.querySelector('.ob-error,.auth-card .error');if(!alert){alert=document.createElement('p');alert.setAttribute('role','alert');button.after(alert);}alert.textContent=error.message||'Google sign-in could not start.';}
 },true);
 async function callback(){
  const params=new URLSearchParams(location.search);if(params.get('portal')!=='owner'||(!params.has('code')&&!params.has('error')))return {handled:false};
  const code=params.get('code'),failed=params.has('error');params.delete('code');params.delete('error');params.delete('error_description');params.delete('error_code');history.replaceState(null,'',location.pathname+'?'+params.toString()+'#login');
  try{let saved;try{saved=JSON.parse(sessionStorage.getItem(marker)||'null');}catch{}
   if(!enabled()||failed||!code||!saved||Date.now()-saved.started>600000||saved.started>Date.now())throw Error();
   const sdk=await client(),result=await sdk.auth.exchangeCodeForSession(code);if(result.error||!result.data?.session)throw Error();clean();return {handled:true,ok:true,session:result.data.session};
  }catch{clean();return {handled:true,ok:false,message:'Google sign-in was cancelled or expired. Please try again, or use email.'};}
 }
 window.JovaGoogleAuth={enabled,button,callback};
})();
