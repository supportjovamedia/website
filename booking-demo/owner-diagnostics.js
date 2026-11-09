/* Bounded operational diagnostics. Never collect form values, URLs, error messages or credentials. */
(() => {
  'use strict';
  const cfg=window.JOVA_SUPABASE;
  if(!cfg?.url||!cfg?.key)return;
  const steps=['signup','login','verification','business_setup','account_access','setup','runtime'];
  const codes=['page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error'];
  const recent=new Map();let sent=0;
  function report(step,code,status=0,token){
    if(!steps.includes(step)||!codes.includes(code)||!Number.isInteger(status)||status<0||status>599)return;
    const key=step+':'+code+':'+status,now=Date.now();
    if(sent>=10||recent.has(key)&&now-recent.get(key)<60000)return;
    let id;try{id=crypto.randomUUID();}catch{return;}
    recent.set(key,now);sent++;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    // No retry queue: a failure must never block login or recursively report itself.
    try{void Promise.resolve(fetch(String(cfg.url).replace(/\/$/,'')+'/rest/v1/rpc/report_owner_flow_event',{
      method:'POST',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',
      headers:{apikey:cfg.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:/^eyJ/.test(cfg.key)?{Authorization:'Bearer '+cfg.key}:{})},
      body:JSON.stringify({p_id:id,p_step:step,p_code:code,p_status:status}),
    })).catch(()=>{}).finally(()=>clearTimeout(timer));}catch{clearTimeout(timer);}
  }
  function failure(path,status,data,token){
    const route=String(path).split('?')[0];
    const step=route==='/auth/v1/signup'?'signup':route==='/auth/v1/token'?'login':route==='/auth/v1/user'?'verification':['/rest/v1/rpc/create_business_for_existing_user','/rest/v1/rpc/create_referred_business'].includes(route)?'business_setup':route==='/rest/v1/rpc/save_setup'?'setup':null;
    if(!step)return;
    const code=status===0?'network_unavailable':status===429?'rate_limited':status>=500?'server_error':data?.error_code==='email_not_confirmed'||data?.code==='email_not_confirmed'?'email_not_confirmed':'request_rejected';
    report(step,code,status,token);
  }
  window.JovaOwnerDiagnostics={report,failure};
  const route=String(location.hash||'').split('?')[0];
  if(location.pathname==='/login'||['#login','#signup'].includes(route))report(route==='#signup'?'signup':'login','page_opened');
  // Runtime reports describe the step only. Stack traces can contain private inputs.
  window.addEventListener('error',()=>{if(['#login','#signup','#setup'].includes(String(location.hash||'')))report('runtime','runtime_error');});
  window.addEventListener('unhandledrejection',()=>{if(['#login','#signup','#setup'].includes(String(location.hash||'')))report('runtime','runtime_error');});
})();
