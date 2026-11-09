/* Operational events only. Never collect form values, URLs, raw errors or credentials. */
(() => {
  'use strict';
  const cfg=window.JOVA_SUPABASE;
  if(!cfg?.url||!cfg?.key)return;
  const steps=['signup','login','verification','business_setup','account_access','setup','runtime','dashboard','calendar','bookings','customers','services','staff','insights','personalise','website','billing','settings','availability'];
  const codes=['page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error','session_identified','step_viewed','step_saved','verification_requested'];
  const stages=['email','check-email','profile','business','category','team','location','software','source','ready'];
  const storageKey='jovabook-diagnostic-visit-v1',uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const recent=new Map();let sent=0,access=null,identity=null,visit=null;
  function excluded(){return ['customer','operator','team'].includes(new URLSearchParams(location.search||'').get('portal'));}
  function sessionId(reset=false){
    try{if(!visit&&!reset){const saved=sessionStorage.getItem(storageKey);if(uuid.test(saved||''))visit=saved;}if(reset||!visit){visit=crypto.randomUUID();sessionStorage.setItem(storageKey,visit);}return visit;}catch{try{return visit||(visit=crypto.randomUUID());}catch{return null;}}
  }
  function report(step,code,status=0,token,stage=null){
    if(excluded()||!steps.includes(step)||!codes.includes(code)||!Number.isInteger(status)||status<0||status>599||stage!==null&&!stages.includes(stage))return;
    const key=step+':'+code+':'+status+':'+(stage||''),now=Date.now();
    if(sent>=20||recent.has(key)&&now-recent.get(key)<60000)return;
    let id;try{id=crypto.randomUUID();}catch{return;}
    const session=sessionId();if(!session)return;
    recent.set(key,now);sent++;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500),auth=token||access;
    // No retry queue: a failure must never block login or recursively report itself.
    try{void Promise.resolve(fetch(String(cfg.url).replace(/\/$/,'')+'/rest/v1/rpc/report_owner_activity',{
      method:'POST',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',
      headers:{apikey:cfg.key,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:/^eyJ/.test(cfg.key)?{Authorization:'Bearer '+cfg.key}:{})},
      body:JSON.stringify({p_id:id,p_session:session,p_step:step,p_code:code,p_status:status,p_stage:stage}),
    })).catch(()=>{}).finally(()=>clearTimeout(timer));}catch{clearTimeout(timer);}
  }
  function setSession(s){
    const next=s?.user?.id||null;
    if(identity&&next!==identity){sessionId(true);recent.clear();sent=0;}
    const changed=next!==identity;identity=next;
    access=next&&typeof s.access_token==='string'&&Number(s.expires_at)*1000>Date.now()?s.access_token:null;
    if(changed&&access)report('account_access','session_identified',200);
  }
  function failure(path,status,data,token){
    const route=String(path).split('?')[0];
    const step=route==='/auth/v1/signup'?'signup':route==='/auth/v1/token'?'login':['/auth/v1/user','/auth/v1/verify','/auth/v1/resend'].includes(route)?'verification':['/rest/v1/rpc/create_business_for_existing_user','/rest/v1/rpc/create_referred_business'].includes(route)?'business_setup':['/rest/v1/rpc/save_setup','/rest/v1/rpc/owner_onboarding_progress'].includes(route)?'setup':null;
    if(!step)return;
    const code=status===0?'network_unavailable':status===429?'rate_limited':status>=500?'server_error':data?.error_code==='email_not_confirmed'||data?.code==='email_not_confirmed'?'email_not_confirmed':'request_rejected';
    report(step,code,status,token);
  }
  function view(route){if(access&&steps.includes(route))report(route,'page_opened');}
  function onboarding(stage,code='step_viewed'){if(stages.includes(stage))report(stage==='email'||stage==='check-email'?'signup':'setup',code,0,undefined,stage);}
  window.JovaOwnerDiagnostics={report,failure,setSession,view,onboarding};
  const route=String(location.hash||'').split('?')[0];
  if(location.pathname==='/login'||['#login','#signup'].includes(route))report(route==='#signup'?'signup':'login','page_opened');
  // Runtime reports describe the step only. Stack traces can contain private inputs.
  window.addEventListener('error',()=>{if(['#login','#signup','#setup'].includes(String(location.hash||'')))report('runtime','runtime_error');});
  window.addEventListener('unhandledrejection',()=>{if(['#login','#signup','#setup'].includes(String(location.hash||'')))report('runtime','runtime_error');});
})();
