/* Free, Solo and Team billing. Historical trials remain readable. */
(() => {
 'use strict';
 const VERSION='2026-11-free-v1',names={essential:'Free',standard:'Solo',premium:'Team'};
 window.JovaOfferSubscriptions={create(api){
  const {salon,esc,money,modal,closeModal,toast,render}=api;
  const records=new Map();let review=null;
  const access=()=>api.accessInfo?.(),billing=()=>access()?.billing||{};
  const visible=sid=>salon().id===sid&&api.isLive?.(salon())&&api.isBillingVisible?.()===true;
  const snapshot=()=>JSON.stringify([salon().id,access()?.business?.plan,billing().paid_until,billing().trial_ends_at,billing().pending_plan,billing().seats,billing().cancel_at_period_end,billing().referral_access_until]);
  function record(){const sid=salon().id;if(!records.has(sid)){const intent=api.claimPurchaseIntent?.();records.set(sid,{cadence:intent?.cadence||billing().cadence||'monthly',seats:intent?.seats||billing().seats||1,busy:false,error:'',requests:new Map(),intent:intent?.plan});}return records.get(sid);}
  const trialRestricted=()=>billing().trial_subscription===true||billing().trial_eligible===true&&access()?.business?.plan==='essential';
  const price=(plan,cadence,seats=1)=>((plan==='essential'?0:plan==='standard'?20:25+6*(seats-1))*(cadence==='annual'?9.6:1));
  const date=value=>Number.isFinite(Date.parse(value||''))?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
  function embedPanel(){if(billing().embed_allowed!==true)return '';const code='<iframe src="https://www.jovamedia.com/api/jovabook/embed/'+encodeURIComponent(salon().slug)+'" title="Book an appointment" width="100%" height="800" loading="lazy" style="border:0"></iframe>';return '<section class="card section-space"><h2>Bookings on your own website</h2><p>Paste this code into the HTML or embed block on your website.</p><label class="field">Your booking embed<textarea readonly rows="4">'+esc(code)+'</textarea></label></section>';}
  const PACKS=[['sms-50','50 texts','£5','sms'],['sms-100','100 texts','£10','sms'],['sms-200','200 texts','£20','sms'],['email-1000','1,000 emails','£5','email'],['email-5000','5,000 emails','£20','email']];
  function topupPanel(entry,b,current){
   const smsOk=current!=='essential',sms=Number(b.sms_credits)||0,email=Number(b.email_credits)||0;
   const smsRemaining=Math.max(0,(Number(b.sms_limit)||0)-(Number(b.sms_used)||0))+sms,emailRemaining=Math.max(0,(Number(b.email_limit)||0)-(Number(b.emails_used)||0))+email;
   return `<div class="sb-topups"><h3>Remaining messages</h3><p class="sb-credit-balance"><strong>${smsRemaining}</strong> texts · <strong>${emailRemaining}</strong> emails</p><p>Includes your unused monthly allowance and purchased credit. Purchased balance: ${sms} texts and ${email} emails.</p><h3>Top up messages</h3><p>Pay once through Stripe. Credits are added automatically after payment is confirmed and never expire. Your monthly allowance is used first.</p><div class="sb-topup-grid">${PACKS.map(([id,label,cost,channel])=>{const locked=channel==='sms'&&!smsOk;return `<button type="button" class="sb-topup" data-action="offer-topup" data-pack="${id}" ${entry.busy||locked?'disabled':''}><strong>${label}</strong><span>${cost}</span>${locked?'<em>Paid plans only</em>':''}</button>`;}).join('')}</div><p>Just paid? Use Refresh details to check your updated balance. If it has not appeared yet, wait a moment and refresh before buying again.</p></div>`;
  }
  function billingPage(){
   const entry=record(),b=billing();if(trialRestricted())entry.seats=1;const current=access()?.business?.plan||'essential',trial=b.trial_subscription===true;
   return `<div class="sb-page" data-offer-version="${VERSION}"><div class="sb-header"><div><p class="sb-eyebrow">YOUR ACCOUNT</p><h1>Subscription</h1><p>Choose the right amount of room for your business.</p></div><button type="button" data-action="offer-refresh" ${entry.busy?'disabled':''}>Refresh details</button></div>
   <section class="sb-current" aria-label="Current subscription"><div><span class="sb-status">${b.referral_access_until?'Referral reward':trial?'14-day trial':current==='essential'?'Free plan':'Paid plan'}</span><h2>${names[current]}</h2>${b.referral_access_until?`<p>Your free Solo month ends ${esc(date(b.referral_access_until))}. No card or automatic charge. Your account returns to Free afterwards.</p>`:''}${trial?`<p>Trial ends ${esc(date(b.trial_ends_at))}. One staff calendar and email notifications. SMS unlocks after payment.</p>`:''}${b.cancel_at_period_end?`<p>Subscription ends ${esc(date(trial?b.trial_ends_at:b.paid_until))}. Then your account moves to Free.</p>`:''}</div><div><strong>${b.seats||1}</strong><span> staff ${(b.seats||1)===1?'seat':'seats'}</span></div></section>
   ${access()?.starter_calendars?.length?`<section class="notice"><h2>Choose your calendar</h2><p>Your staff records and existing appointments are retained. Choose the one calendar that can accept new bookings on Free.</p>${access().starter_calendars.map(staff=>`<button type="button" data-action="offer-starter-calendar" data-staff="${esc(staff.id)}">Use ${esc(staff.name)}</button>`).join('')}</section>`:''}${entry.intent?`<p class="notice">${names[entry.intent]} selected. Review the plan below.</p>`:''}${entry.error?`<div class="error" role="alert">${esc(entry.error)}</div>`:''}
   <div class="sb-cadence-options" role="group" aria-label="Choose billing frequency">${['monthly','annual'].map(value=>`<button type="button" data-action="offer-cadence" data-cadence="${value}" aria-pressed="${entry.cadence===value}" ${entry.busy?'disabled':''}>${value==='monthly'?'Monthly':'Yearly, save 20%'}</button>`).join('')}</div>
   <div class="sb-plan-grid">${Object.entries(names).map(([plan,name])=>{
    const free=plan==='essential',team=plan==='premium',seats=team?entry.seats:1,total=price(plan,entry.cadence,seats),same=(current===plan||b.referral_access_until&&free)&&(free||billing().cadence===entry.cadence&&seats===(b.seats||1));
    return `<section class="sb-plan-card ${same?'is-current':''}" aria-label="${name} plan"><h2>${name}</h2><p class="sb-plan-price"><strong>${money(free?0:entry.cadence==='annual'?total/12:total)}</strong><span> / month</span></p><p>${free?'Free. No card required.':`${entry.cadence==='annual'?money(total)+' billed yearly':money(total)+' billed monthly'}. ${b.trial_eligible&&current==='essential'?'14 days free, card required. Your chosen subscription starts automatically after day 14.':''}`}</p><ul class="sb-plan-features"><li>${free?'20 bookings per month':'Unlimited bookings'}</li><li>${seats} staff ${seats===1?'calendar':'calendars'}</li><li>${free?50:100*seats} emails per month</li><li>${free?'Email alerts only':60*seats+' SMS per month'+(trial?'; available after the trial':'')}</li><li>One-page website and online booking</li>${free?'':'<li>Stripe deposits</li><li>Embed bookings on your own website</li><li>Full Insights and period comparisons</li>'}<li>${team?'Branding removed and extra customisation':'Powered by JovaMedia badge'}</li></ul>
    ${team?`<label class="field">Staff seats, including the first<input type="number" min="1" max="1000" step="1" data-change="offer-seats" value="${seats}" ${entry.busy||trialRestricted()?'disabled':''}></label>${trialRestricted()?'<p>The free trial includes one staff calendar. Add extra seats after payment.</p>':''}<p>£25/month includes one seat. Each extra seat is £6/month. Annual billing saves 20%.</p>`:''}
    <button class="btn ${plan==='standard'?'primary':''}" type="button" data-action="offer-review" data-plan="${plan}" ${entry.busy||same?'disabled':''}>${same?'Current plan':free?'Move to Free':current==='essential'&&b.trial_eligible?'Start 14-day trial':'Choose '+name}</button></section>`;
   }).join('')}</div><section class="sb-allowances" aria-label="Monthly allowances"><h2>Your monthly allowances</h2><p>${b.bookings_used||0} / ${b.booking_limit===null?'unlimited':b.booking_limit??20} bookings · ${b.emails_used||0} / ${b.email_limit??50} emails · ${b.sms_used||0} / ${b.sms_limit||0} SMS</p><p>Allowances reset each calendar month. Messages pause at the limit unless you have top-up credit. Extra messages are never charged automatically.</p>${topupPanel(entry,b,current)}</section><p class="sb-feature-note">All plans have 0% booking commission. Stripe payment-processing fees are separate. Included email and SMS allowances do not roll over.</p>
   ${embedPanel()}${current!=='essential'&&!b.referral_access_until&&!b.cancel_at_period_end?'<div class="sb-account-actions"><button type="button" class="danger" data-action="offer-cancel">Cancel subscription</button></div>':''}
   ${b.pending_plan?`<section class="notice"><h2>Scheduled change</h2><p>${names[b.pending_plan]} from ${esc(date(b.pending_effective_at))}.</p><button type="button" data-action="offer-withdraw">Keep my current plan</button></section>`:''}</div>`;
  }
  function showReview(plan,kind){
   const entry=record(),sid=salon().id;if(!visible(sid)||entry.busy)return;
   if(trialRestricted())entry.seats=1;
   const action=kind||((access()?.business.plan==='essential'||billing().referral_access_until)?'checkout':'change'),seats=plan==='premium'?entry.seats:1,total=price(plan,entry.cadence,seats);
   review={sid,plan,cadence:plan==='essential'?'monthly':entry.cadence,seats,action:plan==='essential'?'cancel':action,snapshot:snapshot()};
   const trial=action==='checkout'&&billing().trial_eligible;
   modal(plan==='essential'?'Cancel subscription':names[plan],`<form data-form="offer-confirm"><h3>${names[plan]}</h3><p>${plan==='essential'?'Your paid subscription or trial ends on its scheduled date. Your account then moves to Free, with one calendar and 20 bookings per month. Your records are retained.':`${trial?'14 days free. Card required. Then ':''}${money(total)} ${entry.cadence==='annual'?'per year, paid upfront':'per month'}, renewing automatically. ${seats} staff ${seats===1?'seat':'seats'}. 0% booking commission. Stripe processing fees are separate.`}</p><div class="error" role="alert"></div><div class="sb-actions"><button type="button" data-action="close-modal">Back</button><button class="btn primary">${plan==='essential'?'Cancel subscription':trial?'Continue to 14-day trial':'Continue'}</button></div></form>`);
  }
  async function confirm(form){
   const chosen=review,entry=record();if(!chosen||entry.busy||!visible(chosen.sid))return;
   if(snapshot()!==chosen.snapshot){api.error(form,'Your plan details changed. Close this review and refresh.');return;}
   const body={plan:chosen.plan,cadence:chosen.cadence,seats:chosen.seats},key=JSON.stringify([chosen.action,body]);
   if(!entry.requests.has(key))entry.requests.set(key,crypto.randomUUID());const request_id=entry.requests.get(key);entry.busy=true;
   form.querySelectorAll('button').forEach(button=>{button.disabled=true;});
   try{
    const result=await api.offerBilling(chosen.action,chosen.action==='cancel'?{request_id}:{...body,request_id});
    if(!visible(chosen.sid))return;if(!result?.ok){if(result?.status===409||result?.data?.status===409)entry.requests.delete(key);throw Error(result?.message||'Your plan could not be verified.');}
    const data=result.data;if(data.url){const url=new URL(data.url);if(url.protocol!=='https:'||url.username||url.password||url.port||!['checkout.stripe.com','billing.stripe.com','invoice.stripe.com'].includes(url.hostname))throw Error('Unrecognised payment page.');window.location.assign(url.href);return;}
    entry.requests.delete(key);closeModal();await api.refreshAccess();if(visible(chosen.sid)){entry.error='';toast(data.kind==='cancellation_scheduled'?'Cancellation scheduled.':'Plan details updated.');render();}
   }catch(e){if(visible(chosen.sid))api.error(form,e.message);}
   finally{entry.busy=false;if(form.isConnected)form.querySelectorAll('button').forEach(button=>{button.disabled=false;});}
  }
  async function refresh(){const entry=record(),sid=salon().id;if(entry.busy)return;entry.busy=true;try{const result=await api.refreshAccess();if(!result?.ok&&visible(sid))entry.error=result?.message||'Could not refresh your plan.';}finally{entry.busy=false;if(visible(sid))render();}}
  function click(action,el){
   if(action==='offer-starter-calendar'){const entry=record(),sid=salon().id;if(!entry.busy){entry.busy=true;void api.chooseStarterCalendar(el.dataset.staff).then(async result=>{if(!visible(sid))return;if(!result.ok)entry.error=result.message;else await api.refreshAccess();}).finally(()=>{entry.busy=false;if(visible(sid))render();});}return true;}
   if(action==='offer-topup'){const pack=el.dataset.pack,entry=record(),sid=salon().id;if(!PACKS.some(p=>p[0]===pack)||entry.busy)return true;entry.busy=true;const key='topup:'+pack;if(!entry.requests.has(key))entry.requests.set(key,crypto.randomUUID());
    void api.offerBilling('topup',{pack,request_id:entry.requests.get(key)}).then(result=>{if(!visible(sid))return;if(!result?.ok)throw Error(result?.message||'Top-up unavailable.');const url=new URL(result.data.url);if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!=='checkout.stripe.com')throw Error('Unrecognised payment page.');entry.requests.delete(key);window.location.assign(url.href);}).catch(e=>{if(visible(sid)){entry.error=e.message;toast(e.message);}}).finally(()=>{entry.busy=false;if(visible(sid))render();});return true;}
   if(action==='offer-refresh'){void refresh();return true;}
   if(action==='offer-cadence'){const entry=record();if(['monthly','annual'].includes(el.dataset.cadence)&&!entry.busy){entry.cadence=el.dataset.cadence;render();document.querySelector('[data-action="offer-cadence"][data-cadence="'+entry.cadence+'"]')?.focus();}return true;}
   if(action==='offer-review'){showReview(el.dataset.plan);return true;}
   if(action==='offer-cancel'){showReview('essential','cancel');return true;}
   if(action==='offer-withdraw'){const entry=record(),sid=salon().id;if(!entry.busy){entry.busy=true;void api.offerBilling('cancel-change',{request_id:crypto.randomUUID()}).then(async result=>{if(!visible(sid))return;if(!result.ok)entry.error=result.message;else await api.refreshAccess();}).finally(()=>{entry.busy=false;if(visible(sid))render();});}return true;}
   return false;
  }
  function change(el){if(el.dataset.change!=='offer-seats')return false;if(trialRestricted()){record().seats=1;render();return true;}const value=Number(el.value);if(Number.isSafeInteger(value)&&value>=1&&value<=1000){record().seats=value;render();document.querySelector('[data-change="offer-seats"]')?.focus();}return true;}
  return {pages:{billing:billingPage,pretrial:billingPage},click,change,submit(type,form){if(type!=='offer-confirm')return false;void confirm(form);return true;}};
 }};
})();
