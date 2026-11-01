import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../subscriptions.js',import.meta.url),'utf8');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const details=(extra={})=>({plan:'essential',staff_limit:1,staff_count:1,billing_connected:false,pending_request:null,changes_supported:true,...extra});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function form(){const buttons=[{disabled:false},{disabled:false}],attributes={};return {buttons,attributes,isConnected:true,lastError:'',setAttribute:(key,value)=>attributes[key]=value,querySelectorAll:()=>buttons,querySelector:()=>buttons[1]};}
function harness(overrides={}){
 const state={id:'salon-a',staff:[{id:'owner'}],subscription:{plan:'Essential',status:'trialing',trialEnd:'2026-12-01T12:00:00Z'}},control={visible:true,live:true},seen={loads:[],requests:[],cancels:[],modals:[],renders:0,closed:0,toasts:[]};
 const api={salon:()=>state,esc:escape,money:value=>'£'+Number(value).toFixed(2),isLive:()=>control.live,isBillingVisible:()=>control.visible,render:()=>seen.renders++,modal:(title,html)=>seen.modals.push({title,html}),closeModal:()=>seen.closed++,toast:text=>seen.toasts.push(text),error:(f,text)=>f.lastError=text,loadSubscription:async sid=>{seen.loads.push(sid);return {ok:true,data:details()};},requestPlan:async(target,sid)=>{seen.requests.push({target,sid});return {ok:true,data:details({pending_request:{id:'request-one',from_plan:'essential',to_plan:target,status:'pending',requested_at:'2026-10-31T10:00:00Z'}})};},cancelPlan:async(id,sid)=>{seen.cancels.push({id,sid});return {ok:true,data:details()};},...overrides};
 const ctx=vm.createContext({window:{},Date,Intl});vm.runInContext(source,ctx);return {tools:ctx.window.JovaSubscriptions.create(api),state,control,seen,api};
}
const choose=(tools,target)=>tools.click('sb-review-plan',{dataset:{plan:target}});
async function loaded(h){h.tools.pages.billing();await settle();return h.tools.pages.billing();}
test('loads once and shows fixed monthly prices, current roster and common core tools',async()=>{
 const h=harness(),html=await loaded(h);h.tools.pages.billing();assert.deepEqual(h.seen.loads,['salon-a']);assert.deepEqual(Array.from(h.tools.routes),['billing']);
 for(const text of ['Essential','Standard','Premium','£20.00','£50.00','£100.00','Most popular','Clients and services','Insights','Billing is not connected'])assert(html.includes(text));
 assert.equal((html.match(/Most popular/g)||[]).length,1);assert(html.includes('aria-label="Standard plan"><span class="sb-popular">Most popular</span>'));
 assert.match(html,/1 of 1/);assert.match(html,/Trial ends/);assert(!/SMS|AI booking|4242|bank account|Simulate first/.test(html));
});
test('plan cards disclose monthly commission on full service price with Premium zero',async()=>{const h=harness(),html=await loaded(h);for(const [name,bps] of [['Essential',100],['Standard',100],['Premium',0]]){const begin=html.indexOf('aria-label="'+name+' plan"'),end=html.indexOf('</section>',begin),card=html.slice(begin,end);assert(card.includes('data-commission-bps="'+bps+'"'));assert(card.includes((bps/100)+'% booking commission on the full service price'));}for(const copy of ['full service price','Unbilled commission carries forward','Premium has 0% booking commission','Monthly commission billing setup is pending'])assert(html.includes(copy));assert.equal((html.match(/Most popular/g)||[]).length,1);});
test('manual review states monthly commission basis without claiming billing is live',async()=>{for(const [plan,rate] of [['standard',1],['premium',0]]){const h=harness();await loaded(h);choose(h.tools,plan);const html=h.seen.modals.at(-1).html;assert(html.includes(rate+'% booking commission on the full service price'));assert(html.includes('full service price'));assert(html.includes('Unbilled commission carries forward'));assert(!html.includes('cash payments')&&!html.includes('refunded too')); assert(html.includes('setup is pending'));}});
test('a live plan request needs review and does not change the current plan or entitlements',async()=>{
 const h=harness();await loaded(h);choose(h.tools,'standard');assert.equal(h.seen.requests.length,0);assert.match(h.seen.modals[0].html,/No payment is taken/);assert.match(h.seen.modals[0].html,/5 staff members/);
 const f=form();assert.equal(h.tools.submit('sb-plan-change',f),true);await settle();assert.deepEqual(h.seen.requests,[{target:'standard',sid:'salon-a'}]);assert.equal(h.state.subscription.plan,'Essential');
 const html=h.tools.pages.billing();assert.match(html,/Essential to Standard/);assert.match(html,/Requested/);assert.match(html,/data-plan="premium" >Request Premium/);assert.equal(h.seen.closed,1);
});
test('demo preview changes only through the host and displays the returned plan',async()=>{
 const h=harness();h.control.live=false;h.api.requestPlan=async(target,sid)=>{h.seen.requests.push({target,sid});h.state.subscription.plan='Standard';return {ok:true,data:details({plan:'standard',staff_limit:5})};};
 await loaded(h);choose(h.tools,'standard');assert.match(h.seen.modals[0].html,/does not start a paid subscription/);h.tools.submit('sb-plan-change',form());await settle();assert.equal(h.seen.requests.length,1);assert.match(h.tools.pages.billing(),/5 staff members/);assert.match(h.seen.toasts[0],/No payment/);
});
test('downgrade is blocked for an oversized roster without removing staff',async()=>{
 const h=harness({loadSubscription:async()=>({ok:true,data:details({plan:'standard',staff_limit:5,staff_count:3})})});h.state.staff=[{id:'a'},{id:'b'},{id:'c'}];const html=await loaded(h);assert.match(html,/data-plan="essential" disabled/);assert.match(html,/Review your staff/);assert.match(html,/No staff records will be removed/);choose(h.tools,'essential');assert.equal(h.seen.modals.length,0);assert.equal(h.seen.requests.length,0);assert.equal(h.state.staff.length,3);
});
test('changing roster after review rejects a stale confirmation',async()=>{
 const h=harness();await loaded(h);choose(h.tools,'standard');h.state.staff.push({id:'new-member'});const f=form();h.tools.submit('sb-plan-change',f);await settle();assert.match(f.lastError,/details changed/);assert.equal(h.seen.requests.length,0);
});
test('a pending target is disabled and another target explains replacement',async()=>{
 const h=harness({loadSubscription:async()=>({ok:true,data:details({pending_request:{id:'old-request',from_plan:'essential',to_plan:'premium',requested_at:'2026-10-31T10:00:00Z'}})})});const html=await loaded(h);assert.match(html,/data-plan="premium" disabled>Requested/);choose(h.tools,'premium');assert.equal(h.seen.modals.length,0);choose(h.tools,'standard');assert.match(h.seen.modals[0].html,/replaces your pending Premium request/);
});
test('confirmation is single flight and restores working controls after success',async()=>{
 let resolve;const h=harness();h.api.requestPlan=(target,sid)=>{h.seen.requests.push({target,sid});return new Promise(done=>resolve=done);};await loaded(h);choose(h.tools,'standard');const f=form();h.tools.submit('sb-plan-change',f);h.tools.submit('sb-plan-change',f);assert.equal(h.seen.requests.length,1);assert(f.buttons.every(button=>button.disabled));
 resolve({ok:true,data:details({pending_request:{id:'r1',from_plan:'essential',to_plan:'standard'}})});await settle();assert.equal(f.attributes['aria-busy'],'false');assert(f.buttons.every(button=>!button.disabled));assert.match(h.tools.pages.billing(),/data-plan="premium" >Request Premium/);
});
test('pending cancellation calls the actual host once and retains the current plan',async()=>{
 let resolve;const h=harness({loadSubscription:async()=>({ok:true,data:details({pending_request:{id:'r1',from_plan:'essential',to_plan:'standard'}})})});h.api.cancelPlan=(id,sid)=>{h.seen.cancels.push({id,sid});return new Promise(done=>resolve=done);};await loaded(h);h.tools.click('sb-cancel-request',{dataset:{id:'r1'}});h.tools.click('sb-cancel-request',{dataset:{id:'r1'}});assert.deepEqual(h.seen.cancels,[{id:'r1',sid:'salon-a'}]);resolve({ok:true,data:details()});await settle();assert(!h.tools.pages.billing().includes('Request pending'));assert.equal(h.state.subscription.plan,'Essential');
});
test('missing change support keeps the current plan visible, disables changes and offers retry',async()=>{
 const h=harness();let attempts=0;h.api.loadSubscription=async()=>++attempts===1?{ok:false,message:'PGRST202 function missing from schema cache'}:{ok:true,data:details()};let html=await loaded(h);assert.match(html,/Your current plan/);assert.match(html,/Plan changes are not available/);assert.match(html,/data-plan="standard" disabled/);assert(!html.includes('PGRST202'));choose(h.tools,'standard');assert.equal(h.seen.modals.length,0);h.tools.click('sb-reload',{});await settle();html=h.tools.pages.billing();assert.match(html,/data-plan="standard" >Request Standard/);assert.equal(attempts,2);
});
test('backend request failure is inline and does not report success or change the plan',async()=>{
 const h=harness({requestPlan:async()=>({ok:false,message:'Please try again in a moment.'})});await loaded(h);choose(h.tools,'standard');const f=form();h.tools.submit('sb-plan-change',f);await settle();assert.equal(f.lastError,'Please try again in a moment.');assert.equal(h.seen.closed,0);assert.equal(h.seen.toasts.length,0);assert.equal(h.state.subscription.plan,'Essential');assert.equal(f.buttons[1].disabled,false);
});
test('a missing request endpoint disables the confirmation and uses nontechnical copy',async()=>{
 const h=harness({requestPlan:async()=>({ok:false,message:'RPC function request_plan_change does not exist'})});await loaded(h);choose(h.tools,'standard');const f=form();h.tools.submit('sb-plan-change',f);await settle();assert.match(f.lastError,/not available for this account/);assert(!f.lastError.includes('RPC'));assert.equal(f.buttons[1].disabled,true);
});
test('late loads never rerender a different salon or another page',async()=>{
 let resolve;const h=harness({loadSubscription:()=>new Promise(done=>resolve=done)});h.tools.pages.billing();h.control.visible=false;h.state.id='salon-b';resolve({ok:true,data:details({plan:'premium',staff_limit:10})});await settle();assert.equal(h.seen.renders,0);assert.equal(h.state.subscription.plan,'Essential');
});
test('late requests keep the captured tenant and do not close or rerender a new page',async()=>{
 let resolve;const h=harness();h.api.requestPlan=(target,sid)=>{h.seen.requests.push({target,sid});return new Promise(done=>resolve=done);};await loaded(h);choose(h.tools,'standard');const f=form();h.tools.submit('sb-plan-change',f);const renders=h.seen.renders;h.state.id='salon-b';h.control.visible=false;f.isConnected=false;resolve({ok:true,data:details({pending_request:{id:'r1',from_plan:'essential',to_plan:'standard'}})});await settle();assert.equal(h.seen.requests[0].sid,'salon-a');assert.equal(h.seen.renders,renders);assert.equal(h.seen.closed,0);assert.equal(h.seen.toasts.length,0);
});
test('existing cancel/restart actions fall through to the host',()=>{const {tools}=harness();assert.equal(tools.click('cancel-subscription',{}),false);assert.equal(tools.click('restart-trial',{}),false);assert.equal(tools.submit('other',form()),false);assert.equal(tools.change({}),false);});

test('Essential purchase entry selects monthly review once without creating a subscription',async()=>{let claimed=0;const h=harness({claimPurchaseIntent:()=>{claimed++;return {plan:'essential',cadence:'monthly'};}});h.state.subscription.cadence='annual';const html=await loaded(h);h.tools.pages.billing();assert.equal(claimed,1);assert.match(html,/data-cadence="monthly" aria-pressed="true"/);assert.match(html,/You chose Essential: £20 a month/);assert.equal(h.seen.requests.length,0);assert.equal(h.seen.modals.length,0);assert.equal(h.state.subscription.cadence,'annual');});

test('Annual purchase intent selects annual only with server support, otherwise stays honestly monthly',async()=>{for(const supported of [false,true]){const h=harness({claimPurchaseIntent:()=>({plan:'essential',cadence:'annual'}),accessInfo:()=>({business:{id:'salon-a'},billing:{annual_supported:supported}})}),html=await loaded(h);assert.match(html,new RegExp('data-cadence="'+(supported?'annual':'monthly')+'" aria-pressed="true"'));assert.match(html,/£192 a year paid upfront/);assert.equal(html.includes('Annual billing is not ready for this account'),!supported);assert.equal(h.seen.requests.length,0);}});
