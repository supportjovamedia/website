import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../business-integrations.js',import.meta.url),'utf8');
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function setup(plan='standard'){
 const context={window:{},Date,Set,Map};vm.runInNewContext(source,context);const providers=context.window.JovaBusinessIntegrations.providers;
 const status={salon_id:'s1',recovery_available:false,integrations:providers.map(p=>({provider:p.id,state:'not_connected',account_verified:false,recovery_ready:false,checkout_ready:false,reminders_ready:false,missing_requirements:[]}))};
 const tools=context.window.JovaBusinessIntegrations.create({salon:()=>({id:'s1',name:'<Studio>',entitlements:{plan}}),ownerIdentity:()=> 'owner',isLive:()=>true,esc,render(){},integrationRequest:async()=>({ok:true,data:status})});return{tools,status};
}
test('integration presentation preserves all four actual providers and unavailable pre-check state',()=>{
 const {tools}=setup(),html=tools.pages.integrations();
 for(const provider of ['stripe','mailchimp','sms_works','twilio'])assert(html.includes('data-provider="'+provider+'"'));
 assert(!html.includes('data-provider="paypal"'));assert.equal((html.match(/class="bi-card"/g)||[]).length,4);assert(html.includes('Not checked'));assert(html.includes('&lt;Studio&gt;'));assert(!html.includes('<Studio>'));assert(html.includes('bi-refreshed'));assert(!html.includes('bi-eyebrow'));
});
test('verified credentials remain distinct from a feature being active',async()=>{
 const {tools,status}=setup();Object.assign(status.integrations[0],{state:'credentials_verified',account_verified:true});tools.pages.integrations();await new Promise(resolve=>setImmediate(resolve));
 const html=tools.pages.integrations();assert(html.includes('Account verified'));assert(html.includes('Customer payments not active'));assert(html.includes('Text delivery not active'));assert(!html.includes('Customer checkout ready'));
});
test('free-plan provider locks and upgrade actions keep current eligibility unchanged',async()=>{
 const {tools}=setup('essential');tools.pages.integrations();await new Promise(resolve=>setImmediate(resolve));const html=tools.pages.integrations();assert.equal((html.match(/data-action="bi-upgrade"/g)||[]).length,4);assert(html.includes('Solo or Team'));assert(html.includes('Compare plans'));
});
