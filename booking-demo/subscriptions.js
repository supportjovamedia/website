/* Subscription requests. The host owns account changes and persistence. */
(() => {
 'use strict';
 window.JovaSubscriptions={create(api) {
  const {salon,esc,money,modal,closeModal,toast,error,render}=api;
  const catalog={essential:{name:'Essential',price:20,limit:1},standard:{name:'Standard',price:50,limit:5},premium:{name:'Premium',price:100,limit:10}};
  const records=new Map();let review=null,sequence=0;
  const live=()=>typeof api.isLive==='function'&&api.isLive(salon());
  const visible=sid=>salon().id===sid&&typeof api.isBillingVisible==='function'&&api.isBillingVisible()===true;
  const normal=value=>Object.hasOwn(catalog,String(value||'').toLowerCase())?String(value).toLowerCase():'essential';
  const setupMessage='Plan changes are not available for this account yet. Your current plan is unchanged.';
  const setupError=message=>/PGRST|RPC|schema cache|function|does not exist|not installed|migration|setup needed/i.test(String(message||''));
  const friendly=(message,fallback)=>setupError(message)?setupMessage:String(message||fallback);
  const dateText=value=>Number.isFinite(Date.parse(value||''))?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
  function record(sid){if(!records.has(sid))records.set(sid,{data:null,loading:false,loaded:false,busy:false,available:false,error:'',revision:0});return records.get(sid);}
  function fallback(){const s=salon(),plan=normal(s.entitlements?.plan||s.plan||s.subscription?.plan);return {plan,staff_limit:Number(s.capabilities?.staff_limit)||catalog[plan].limit,staff_count:s.staff?.length||0,billing_connected:false,pending_request:null,changes_supported:false};}
  function dataFor(entry){return entry.data||fallback();}
  function countFor(data){return Math.max(Number(data.staff_count)||0,salon().staff?.length||0);}
  function currentMessage(entry,message){entry.error=message;if(visible(salon().id))render();}
  async function load(sid) {
   const entry=record(sid);if(entry.loading||entry.busy)return;
   entry.loading=true;entry.error='';const revision=++entry.revision;
   try {
    if(typeof api.loadSubscription!=='function')throw Error(setupMessage);
    const result=await api.loadSubscription(sid);if(revision!==entry.revision)return;
    if(!result?.ok||!result.data)throw Error(friendly(result?.message,'We could not load your plan details. Please try again.'));
    entry.data={...result.data,plan:normal(result.data.plan)};entry.available=result.data.changes_supported===true;
    if(!entry.available)entry.error=setupMessage;
   }catch(caught){if(revision===entry.revision){entry.available=false;entry.error=friendly(caught.message,'We could not load your plan details. Please try again.');}}
   finally{if(revision===entry.revision){entry.loading=false;entry.loaded=true;if(visible(sid))render();}}
  }
  function pendingSummary(data,entry) {
   const pending=data.pending_request;if(!pending)return '';
   const target=catalog[normal(pending.to_plan)],from=catalog[normal(pending.from_plan||data.plan)],requested=dateText(pending.requested_at);
   return `<section class="sb-change-summary" aria-label="Pending plan request"><div><span class="sb-status">Request pending</span><h2>${from.name} to ${target.name}</h2><p>Your current plan and staff limit stay in place until the change is confirmed. No payment has been taken.</p>${requested?`<small>Requested ${esc(requested)}</small>`:''}</div><button type="button" data-action="sb-cancel-request" data-id="${esc(pending.id)}" ${entry.busy||entry.loading||!entry.available?'disabled':''}>${entry.busy?'Please wait…':'Cancel request'}</button></section>`;
  }
  function billing() {
   const s=salon(),entry=record(s.id);if(!entry.loaded&&!entry.loading)void load(s.id);
   const data=dataFor(entry),current=catalog[normal(data.plan)],sub=s.subscription||{},status={trialing:'Trial',active:'Active',cancelled:'Cancelled',past_due:'Needs attention',setup:'Setup in progress'}[sub.status]||'Not confirmed',trial=sub.status==='trialing'?dateText(sub.trialEnd):'';
   const roster=countFor(data),limit=Number(data.staff_limit)||current.limit;
   return `<div class="sb-page" data-subscription-page><div class="sb-header"><div><p class="sb-eyebrow">YOUR ACCOUNT</p><h1>Subscription</h1><p>Choose the right amount of room for your team.</p></div><button type="button" data-action="sb-reload" ${entry.loading||entry.busy?'disabled':''}>${entry.loading?'Loading details…':'Refresh details'}</button></div><section class="sb-current" aria-label="Current subscription"><div><span class="sb-status">${esc(status)}</span><p>Your current plan</p><h2>${current.name}</h2>${trial?`<small>Trial ends ${esc(trial)}</small>`:''}</div><div><strong>${roster} of ${limit}</strong><span> staff ${limit===1?'member':'members'}</span><p>${money(current.price)} / month <span class="sb-guide">guide price</span></p></div></section><p class="sb-billing-note">${live()?'Guide prices help you compare plans. Features and payment arrangements will be confirmed before a live change.':'Preview a plan to see its staff limit in this browser. No payment is taken.'} ${data.billing_connected?'':'Billing is not connected. No payment will be taken here.'}</p><div class="error sb-error" role="alert" ${entry.error?'':'hidden'}>${esc(entry.error)}</div>${pendingSummary(data,entry)}<div class="sb-plan-grid">${Object.entries(catalog).map(([id,plan])=>{
    const isCurrent=id===data.plan,isPending=data.pending_request?.to_plan===id,blocked=roster>plan.limit,disabled=isCurrent||isPending||blocked||entry.loading||entry.busy||!entry.available;
    const label=isCurrent?'Current plan':isPending?'Requested':`${live()?'Request':'Preview'} ${plan.name}`;
    return `<section class="sb-plan-card ${isCurrent?'is-current':''}" aria-label="${plan.name} plan">${isCurrent?'<span class="sb-status">Current plan</span>':''}<h2>${plan.name}</h2><p class="sb-plan-price"><strong>${money(plan.price)}</strong><span> / month</span><small>Guide price</small></p><ul class="sb-plan-features"><li>${plan.limit} staff ${plan.limit===1?'member':'members'}</li><li>Online booking</li><li>Clients and services</li><li>Booking calendar</li><li>${id==='premium'?'Multi-page website, built by JovaMedia':'One-page website, built by JovaMedia'}</li><li>Email reminders <small>(when email delivery is activated)</small></li>${id!=='essential'?'<li>Insights</li>':''}</ul><div class="sb-actions"><button type="button" class="btn ${isCurrent?'':'primary'}" data-action="sb-review-plan" data-plan="${id}" ${disabled?'disabled':''}>${label}</button></div>${blocked&&!isCurrent?`<p class="sb-limit-note">Your team has ${roster} people. This plan supports ${plan.limit}. <a href="#staff">Review your staff</a> before choosing this plan. No staff records will be removed.</p>`:''}</section>`;
   }).join('')}</div><p class="sb-feature-note">Website setup is carried out by JovaMedia. Standard and Premium text reminders and slot recovery, plus the Premium AI assistant, are planned features and are not activated here. Billing arrangements are confirmed separately.</p><div class="sb-actions sb-account-actions">${sub.status==='cancelled'?'<button type="button" data-action="restart-trial">Restart subscription</button>':'<button type="button" class="danger" data-action="cancel-subscription">Cancel subscription</button>'}</div></div>`;
  }
  const signature=(data,target)=>JSON.stringify({from:data.plan,to:target,pending:data.pending_request?.id||'',count:countFor(data)});
  function reviewPlan(target) {
   const sid=salon().id,entry=record(sid),data=dataFor(entry),plan=catalog[target];
   if(!plan||!visible(sid))return;
   if(entry.busy||entry.loading){toast('Please wait for your plan details to finish updating.');return;}
   if(!entry.available){currentMessage(entry,setupMessage);return;}
   if(target===data.plan||data.pending_request?.to_plan===target)return;
   if(countFor(data)>plan.limit){currentMessage(entry,`This plan supports ${plan.limit} staff ${plan.limit===1?'member':'members'}. Review your team before choosing it.`);return;}
   const isLive=live();review={sid,target,live:isLive,signature:signature(data,target),serial:++sequence};
   const pending=data.pending_request,replacement=pending?`<p>This replaces your pending ${catalog[normal(pending.to_plan)].name} request.</p>`:'';
   modal(`${isLive?'Request':'Preview'} ${plan.name}`,`<form data-form="sb-plan-change"><div class="sb-change-summary"><h3>${plan.name}</h3><p class="sb-plan-price"><strong>${money(plan.price)}</strong><span> / month guide price</span></p><p>Up to ${plan.limit} staff ${plan.limit===1?'member':'members'}, with the core booking tools.</p>${replacement}<p>${isLive?`This saves a request for review. Your ${catalog[normal(data.plan)].name} plan and staff limit stay in place until the change is confirmed. No payment is taken.`:'This changes the plan preview in this browser. It does not start a paid subscription or take a payment.'}</p></div><div class="error" role="alert"></div><div class="sb-actions"><button type="button" data-action="close-modal">Keep current plan</button><button class="btn primary">${isLive?'Confirm request':'Preview this plan'}</button></div></form>`);
  }
  function setBusy(form,busy) {if(!form)return;form.setAttribute('aria-busy',String(busy));form.querySelectorAll('button').forEach(button=>{button.disabled=busy;});}
  async function confirm(form) {
   const context=review;if(!context)return;
   const entry=record(context.sid);if(entry.busy)return;
   if(!visible(context.sid)){error(form,'Your account or page changed. Open Subscription and review the plan again.');return;}
   const data=dataFor(entry),plan=catalog[context.target];
   if(!entry.available){error(form,setupMessage);return;}
   if(context.signature!==signature(data,context.target)||countFor(data)>plan.limit){error(form,'Your plan details changed. Review this change again before continuing.');return;}
   entry.busy=true;entry.error='';error(form,'');setBusy(form,true);
   try {
    const result=await api.requestPlan(context.target,context.sid);
    if(!result?.ok||!result.data)throw Error(friendly(result?.message,'We could not save your plan change. Please try again.'));
    entry.data={...result.data,plan:normal(result.data.plan)};entry.available=result.data.changes_supported===true;entry.busy=false;
    if(review?.serial===context.serial)review=null;
    if(visible(context.sid)){if(form.isConnected)closeModal();render();toast(context.live?'Your plan change request has been saved.':'Plan preview updated. No payment was taken.');}
   }catch(caught){const message=friendly(caught.message,'We could not save your plan change. Please try again.');entry.error=message;if(setupError(caught.message)||message===setupMessage)entry.available=false;if(form.isConnected&&visible(context.sid))error(form,message);}
   finally{entry.busy=false;if(form.isConnected){setBusy(form,false);if(!entry.available){const confirm=form.querySelector('button.primary');if(confirm)confirm.disabled=true;}}}
  }
  async function cancelRequest(requestId) {
   const sid=salon().id,entry=record(sid),data=dataFor(entry);
   if(entry.busy||entry.loading||!visible(sid))return;
   if(!entry.available){currentMessage(entry,setupMessage);return;}
   if(!data.pending_request||data.pending_request.id!==requestId){currentMessage(entry,'This request has changed. Refresh your plan details and try again.');return;}
   entry.busy=true;entry.error='';render();
   try {
    const result=await api.cancelPlan(requestId,sid);
    if(!result?.ok||!result.data)throw Error(friendly(result?.message,'We could not cancel this request. Please try again.'));
    entry.data={...result.data,plan:normal(result.data.plan)};entry.available=result.data.changes_supported===true;
    if(visible(sid))toast('Plan change request cancelled. Your current plan stays the same.');
   }catch(caught){entry.error=friendly(caught.message,'We could not cancel this request. Please try again.');if(setupError(caught.message)||entry.error===setupMessage)entry.available=false;}
   finally{entry.busy=false;if(visible(sid))render();}
  }
  function click(action,element) {
   if(action==='sb-reload'){const sid=salon().id,entry=record(sid);if(!entry.busy&&!entry.loading){entry.loaded=false;void load(sid);if(visible(sid))render();}return true;}
   if(action==='sb-review-plan'){reviewPlan(element.dataset.plan);return true;}
   if(action==='sb-cancel-request'){void cancelRequest(element.dataset.id);return true;}
   return false;
  }
  function submit(type,form) {if(type!=='sb-plan-change')return false;void confirm(form);return true;}
  return {routes:['billing'],pages:{billing},click,submit,change:()=>false};
 }};
})();
