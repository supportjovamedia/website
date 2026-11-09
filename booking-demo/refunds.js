/* Read-only, owner-scoped refund activity. Payments remain in the salon's Stripe account. */
(() => {
 'use strict';
 window.JovaRefunds={create(api){
  let state=null;
  const key=()=>api.ownerIdentity()+'|'+api.salon().id;
  const active=()=>api.isLive(api.salon())&&api.isDashboardVisible();
  function record(){const identity=key();if(state?.identity!==identity)state={identity,rows:null,loading:false,error:'',loaded:false};return state;}
  async function load(force=false){
   if(!active())return;const entry=record();if(entry.loading||!force&&entry.loaded)return;
   entry.loading=true;
   try{const result=await api.refundActivity();if(state!==entry||key()!==entry.identity)return;if(!result?.ok||!Array.isArray(result.refunds))throw Error('Refund status is unavailable. Try again.');entry.rows=result.refunds;entry.error='';}
   catch{if(state===entry)entry.error='Refund status is unavailable. Try again.';}
   finally{if(state===entry){entry.loading=false;entry.loaded=true;if(active()&&key()===entry.identity)api.render();}}
  }
  const labels={requested:'Refund requested',sending:'Processing',pending:'Processing',succeeded:'Refunded',failed:'Needs attention',needs_attention:'Needs attention'};
  function panel(){
   if(!active())return '';const entry=record();if(!entry.loading&&!entry.loaded)queueMicrotask(()=>void load());
   return '<section class="db-appointments db-refunds" aria-label="Recent refunds"><div class="db-list-heading"><h2>Recent refunds</h2><button type="button" class="btn small" data-action="refresh-refunds" '+(entry.loading?'disabled':'')+'>'+(entry.loading?'Checking…':'Refresh')+'</button></div>'+(entry.error?'<p class="error" role="alert">'+entry.error+'</p>':'')+(entry.rows?.length?'<div class="db-refund-list">'+entry.rows.map(r=>'<article class="db-refund-row"><div><strong>'+api.esc(r.customer||'Customer')+'</strong><span>'+api.esc(r.service||'Booking')+' · '+api.esc(r.date?api.humanDate(r.date):'')+(r.time?' · '+api.esc(r.time):'')+'</span></div><strong>'+api.money(Number(r.amount_minor)/100)+'</strong><span class="pill '+(r.status==='succeeded'?'green':['failed','needs_attention'].includes(r.status)?'amber':'')+'">'+api.esc(labels[r.status]||'Checking status')+'</span></article>').join('')+'</div>':entry.rows?'<p>No refund requests yet.</p>':'<p role="status">Checking refunds…</p>')+'</section>';
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="refresh-refunds"]')&&active())void load(true);});
  // Load once for this owner/business, then read again only after pressing Refresh.
  return {panel};
 }};
})();
