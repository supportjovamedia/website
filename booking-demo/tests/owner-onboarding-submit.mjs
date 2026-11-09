import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../owner-onboarding.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
class Values {
 constructor(form){this.entries=Object.entries(form.values).flatMap(([name,value])=>Array.isArray(value)?value.map(item=>[name,item]):[[name,value]]);}
 get(name){return this.entries.find(([key])=>key===name)?.[1]??null;}
 has(name){return this.entries.some(([key])=>key===name);}
 getAll(name){return this.entries.filter(([key])=>key===name).map(([,value])=>value);}
 [Symbol.iterator](){return this.entries[Symbol.iterator]();}
}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function harness(overrides={}){
 let owner='owner-a',html='',renders=0;const listeners={},writes=[],creates=[];
 const progress=id=>({ok:true,data:{data:{first_name:id==='owner-a'?'Avery':'Jordan'},steps:{profile:true},email:id+'@example.test',business_id:null}});
 const directory={sessionIdentity:()=>owner,needsOwnerPassword:()=>false,onboardingProgress:async(step='read',payload={})=>{if(step!=='read')writes.push({owner,step,payload});return progress(owner);},createBusinessForExistingUser:async payload=>{creates.push({owner,payload});return {ok:true,account:{salonId:'business-'+owner}};},...overrides};
 let tools;const context={window:{},document:{addEventListener:(event,handler)=>(listeners[event]||=[]).push(handler),querySelector:()=>null},Date,FormData:Values,clearInterval:()=>{},setInterval:()=>0,setTimeout:()=>0};
 vm.runInNewContext(source,context);tools=context.window.JovaOwnerOnboarding.create({directory,esc,render:()=>{renders++;html=tools.page();},logout:async()=>{},openDashboard:async()=>({ok:true})});
 const page=()=>html=tools.page();
 function form(stage='business',values={}){const button={textContent:'Continue',disabled:false},alert={textContent:''},f={dataset:{stage},values:{business_name:'Avery Studio',booking_slug:'avery-studio',existing_website:'https://example.test',referral_code:'',...values},elements:{},isConnected:true,attributes:{},closest:()=>f,querySelector:selector=>selector==='button.primary'?button:selector==='.ob-error'?alert:null,setAttribute:(key,value)=>f.attributes[key]=value,removeAttribute:key=>delete f.attributes[key]};for(const name of Object.keys(f.values))f.elements[name]={get value(){return f.values[name];},set value(value){f.values[name]=value;}};return {f,button,alert};}
 const submit=f=>listeners.submit[0]({target:f,preventDefault(){},stopImmediatePropagation(){}});
 return {tools,directory,page,submit,form,writes,creates,owner:value=>owner=value,get html(){return html;},get renders(){return renders;},async ready(){page();await settle();}};
}
test('a late business creation cannot write old-owner setup into a new owner session',async()=>{
 const gate=deferred(),h=harness({createBusinessForExistingUser:()=>gate.promise});await h.ready();const old=h.form();h.submit(old.f);assert.equal(old.button.textContent,'Saving...');
 h.owner('owner-b');h.page();await settle();gate.resolve({ok:true,account:{salonId:'business-owner-a'}});await settle();
 assert.equal(h.writes.filter(row=>row.owner==='owner-b'&&row.step==='business').length,0,'An old operation must stop before its next authenticated write');assert(!h.page().includes('business-owner-a'));
});
test('a new owner can submit while an old request settles without unlocking the new operation',async()=>{
 const gates=[deferred(),deferred()];let calls=0;const h=harness({createBusinessForExistingUser:()=>gates[calls++].promise});await h.ready();h.submit(h.form().f);h.owner('owner-b');h.page();await settle();const current=h.form('business',{business_name:'Jordan Studio',booking_slug:'jordan-studio'});h.submit(current.f);assert.equal(calls,2);
 gates[0].resolve({ok:true,account:{salonId:'old-business'}});await settle();h.submit(current.f);assert.equal(calls,2,'The old finally cannot release the new owner pending lock');gates[1].resolve({ok:true,account:{salonId:'new-business'}});await settle();assert.equal(h.writes.filter(row=>row.step==='business').length,1);
});
test('progress failure preserves the business draft and retry cannot create a duplicate business',async()=>{
 let failures=1,creates=0;const h=harness({createBusinessForExistingUser:async()=>{creates++;return {ok:true,account:{salonId:'business-a'}};}});const base=h.directory.onboardingProgress;h.directory.onboardingProgress=async(step,payload)=>step==='business'&&failures-->0?{ok:false,message:'Progress unavailable'}:base(step,payload);await h.ready();const form=h.form();h.submit(form.f);await settle();assert.equal(form.button.disabled,false);assert.equal(form.button.textContent,'Continue');assert.match(form.alert.textContent,/unavailable/);assert.equal(form.f.values.business_name,'Avery Studio');assert.match(h.page(),/value="Avery Studio"/,'A same-owner re-render must preserve the submitted draft');h.submit(form.f);await settle();assert.equal(creates,1);assert.match(h.page(),/primary service/);
});
test('a same-owner rejected request restores the button and allows retry',async()=>{
 const gate=deferred();let calls=0;const h=harness({createBusinessForExistingUser:()=>++calls===1?gate.promise:Promise.resolve({ok:true,account:{salonId:'business-a'}})});await h.ready();const form=h.form();h.submit(form.f);h.submit(form.f);assert.equal(calls,1);gate.reject(Error('Temporary connection failure'));await settle();assert.equal(form.button.disabled,false);assert.equal(form.button.textContent,'Continue');assert.match(form.alert.textContent,/Temporary connection/);h.submit(form.f);await settle();assert.equal(calls,2);assert.match(h.page(),/primary service/);
});
