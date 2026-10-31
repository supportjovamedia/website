import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../owner-tools.js',import.meta.url),'utf8');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plus=(key,days)=>{const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const seed=()=>({id:'salon-1',staff:[{id:'owner',name:'Sam',active:true},{id:'other',name:'Jordan',active:true}],services:[{id:'brows',name:'Brow <care>',price:40,duration:30,staffIds:['owner']}],customers:[{id:'c1',name:'QA Client',email:'qa@example.com'}],bookings:[
 {id:'b1',date:'2026-10-05',time:'10:00',staffId:'owner',customerId:'c1',serviceId:'brows',serviceName:'Brow <care>',price:40,duration:30,status:'confirmed'},
 {id:'b2',date:'2026-10-06',time:'10:00',staffId:'owner',customerId:'c1',serviceId:'brows',serviceName:'Brow <care>',price:60,duration:60,status:'completed'},
 {id:'b3',date:'2026-10-07',time:'10:00',staffId:'other',customerId:'c2',serviceId:'brows',serviceName:'Brow <care>',price:900,duration:120,status:'cancelled'},
 {id:'b4',date:'2026-10-08',time:'10:00',staffId:'other',customerId:'c3',serviceId:'brows',serviceName:'Brow <care>',price:800,duration:60,status:'no_show'},
 {id:'b5',date:'2026-09-30',time:'10:00',staffId:'owner',customerId:'c4',serviceId:'brows',serviceName:'Brow <care>',price:700,duration:60,status:'confirmed'}
]});
class FakeFormData {constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}}
function form(values={}) {
 const preview={innerHTML:''},attributes={},controls=[{disabled:false},{disabled:true}];
 return {values:{...values},preview,attributes,controls,isConnected:true,lastError:'',querySelector:selector=>selector==='[data-owner-series-preview]'?preview:null,querySelectorAll:()=>controls,setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key]};
}
function harness(overrides={}) {
 const state=seed(),seen={modals:[],toasts:[],errors:[],requests:[],renders:0,closed:0};
 const api={salon:()=>state,render:()=>seen.renders++,esc:escape,money:value=>'£'+Number(value).toFixed(2),today:()=>'2026-10-30',addDays:plus,modal:(title,html)=>seen.modals.push({title,html}),closeModal:()=>seen.closed++,toast:text=>seen.toasts.push(text),error:(form,text)=>{form.lastError=text;seen.errors.push(text);},available:()=>['09:00','10:00'],isLive:()=>false,seriesSupported:()=>true,createSeries:async request=>{seen.requests.push(request);return {ok:true,bookings:request.dates.map(date=>({date}))};},...overrides};
 const context=vm.createContext({window:{},FormData:FakeFormData,Intl,Date,console});vm.runInContext(source,context);
 const tools=context.window.JovaOwnerTools.create(api);return {tools,state,seen,api};
}
function seriesForm(values={}) {return form({serviceId:'brows',staffId:'owner',startDate:'2026-11-03',time:'10:00',count:'3',intervalWeeks:'2',name:'QA Client',email:'qa@example.com',phone:'',notes:'Private note',customerId:'c1',...values});}
const element=form=>({closest:()=>form});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('insights use actual records and exclude cancelled/no-show value',()=>{
 const {tools}=harness(),html=tools.pages.insights();
 assert.deepEqual(Array.from(tools.routes),['insights']);
 assert.match(html,/Bookings<\/span><strong>4<\/strong>/);
 assert.match(html,/Scheduled value<\/span><strong>£100\.00<\/strong>/);
 assert.match(html,/Booked hours<\/span><strong>1\.5<\/strong>/);
 assert.match(html,/Clients booked<\/span><strong>3<\/strong>/);
 assert.match(html,/No-shows<\/span><strong>1<\/strong>/);
 assert.match(html,/Brow &lt;care&gt;/);assert(!html.includes('£900.00'));
 assert.match(html,/5 Oct 2026: 1 booking/);assert.match(html,/not collected cash/);
});
test('custom date and staff filters change the actual insight totals',()=>{
 const {tools}=harness();const filters=form({period:'custom',start:'2026-10-06',end:'2026-10-08',staff:'owner'});
 assert.equal(tools.submit('owner-insights',filters),true);const html=tools.pages.insights();
 assert.match(html,/Bookings<\/span><strong>1<\/strong>/);assert.match(html,/Scheduled value<\/span><strong>£60\.00<\/strong>/);
 assert.match(html,/6 Oct 2026 to 8 Oct 2026/);assert.match(html,/6 Oct 2026: 1 booking/);
});
test('invalid, reversed and excessive date ranges retain the last valid filter',()=>{
 const {tools}=harness();
 for(const [start,end] of [['2026-02-31','2026-03-02'],['2026-10-20','2026-10-01'],['2025-01-01','2026-10-30']]){
  const f=form({period:'custom',start,end,staff:'all'});tools.submit('owner-insights',f);assert.match(f.lastError,/valid date range/);
 }
 assert.match(tools.pages.insights(),/Scheduled value<\/span><strong>£100\.00<\/strong>/);
});
test('an empty period shows an honest empty state',()=>{
 const {tools}=harness();tools.submit('owner-insights',form({period:'custom',start:'2026-01-01',end:'2026-01-02',staff:'all'}));
 const html=tools.pages.insights();assert.match(html,/No bookings in this period/);assert.match(html,/Scheduled value<\/span><strong>£0\.00<\/strong>/);
});
test('unsupported live series has a clear setup message and no form',()=>{
 const {tools,seen}=harness({isLive:()=>true,seriesSupported:()=>false});assert.equal(tools.click('owner-series',{}),true);
 assert.match(seen.modals[0].html,/booking update/);assert(!seen.modals[0].html.includes('data-form="owner-series"'));
});
test('series preview checks every date, and conflicts prevent any submission',async()=>{
 const checked=[];const {tools,seen}=harness({available:(date)=>{checked.push(date);return date==='2026-11-17'?[]:['10:00'];}});
 tools.click('owner-series',{});checked.length=0;const f=seriesForm();assert.equal(tools.submit('owner-series',f),true);
 assert.deepEqual(checked,['2026-11-03','2026-11-17','2026-12-01']);assert.match(f.preview.innerHTML,/Unavailable/);assert(!f.preview.innerHTML.includes('owner-series-confirm'));
 tools.click('owner-series-confirm',element(f));await settle();assert.equal(seen.requests.length,0);
});
test('valid series requires confirmation and submits one complete request',async()=>{
 const {tools,seen}=harness();tools.click('owner-series',{});const f=seriesForm();tools.submit('owner-series',f);
 assert.equal(seen.requests.length,0);assert.match(f.preview.innerHTML,/Book 3 bookings/);
 assert.equal(tools.click('owner-series-confirm',element(f)),true);await settle();assert.equal(seen.requests.length,1);
 const request=seen.requests[0];assert.deepEqual(Array.from(request.dates),['2026-11-03','2026-11-17','2026-12-01']);
 assert.equal(request.staffId,'owner');assert.equal(request.customerId,'c1');assert.equal(request.notes,'Private note');assert.equal(seen.closed,1);assert.equal(f.attributes['aria-busy'],undefined);
 assert.equal(f.controls[0].disabled,false);assert.equal(f.controls[1].disabled,true);
});
test('changing form details after checking dates rejects a stale confirmation',async()=>{
 const {tools,seen}=harness();tools.click('owner-series',{});const f=seriesForm();tools.submit('owner-series',f);f.values.time='09:00';
 tools.click('owner-series-confirm',element(f));await settle();assert.match(f.lastError,/details changed/);assert.equal(seen.requests.length,0);
});
test('new availability conflict is checked again before an atomic request',async()=>{
 let blocked=false;const {tools,seen}=harness({available:date=>blocked&&date==='2026-11-17'?[]:['10:00']});
 tools.click('owner-series',{});const f=seriesForm();tools.submit('owner-series',f);blocked=true;tools.click('owner-series-confirm',element(f));await settle();
 assert.equal(seen.requests.length,0);assert.match(f.lastError,/no longer available/);assert.match(f.preview.innerHTML,/Unavailable/);
});
test('pending series cannot be double submitted and server failures stay visible',async()=>{
 let resolve;const {tools,seen}=harness({createSeries:request=>{seen.requests.push(request);return new Promise(done=>resolve=done);}});
 tools.click('owner-series',{});const f=seriesForm();tools.submit('owner-series',f);tools.click('owner-series-confirm',element(f));tools.click('owner-series-confirm',element(f));
 assert.equal(seen.requests.length,1);assert.equal(f.attributes['aria-busy'],'true');assert(f.controls.every(control=>control.disabled));
 resolve({ok:false,message:'A date was booked by another client. Nothing was added.'});await settle();
 assert.match(f.lastError,/Nothing was added/);assert.equal(seen.closed,0);assert.equal(f.controls[0].disabled,false);assert.equal(f.attributes['aria-busy'],undefined);
});
test('series validates count, interval, staff and start date before preview',()=>{
 const {tools}=harness();tools.click('owner-series',{});
 for(const [values,pattern] of [[{count:'13'},/2 and 12/],[{count:'1'},/2 and 12/],[{intervalWeeks:'0'},/1 to 52/],[{staffId:'other'},/offers it/],[{startDate:'2026-10-29'},/today or later/]]){
  const f=seriesForm(values);tools.submit('owner-series',f);assert.match(f.lastError,pattern);assert(!f.preview.innerHTML.includes('owner-series-confirm'));
 }
});
