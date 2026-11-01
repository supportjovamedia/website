import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../owner-tools.js',import.meta.url),'utf8');
const scheduling=await readFile(new URL('../scheduling-core.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const context={window:{},Date,Intl};vm.runInNewContext(source,context);
const calculate=(salon,filter={start:'2026-10-01',end:'2026-10-31',staff:'all'},asOf={date:'2026-10-15',time:'12:00'})=>plain(context.window.JovaOwnerTools.comparePerformance(salon,filter,asOf));
const booking=(id,date,price=25,fields={})=>({id,date,time:'10:00',price,status:'completed',staffId:'a',serviceId:'cut',serviceName:'Haircut',...fields});
const seed=()=>({id:'one',staff:[{id:'a',name:'Sam'},{id:'b',name:'Jordan',active:false}],bookings:[booking('current','2026-10-02',25),booking('today','2026-10-15',75),booking('future','2026-10-20',999),booking('future-today','2026-10-15',888,{time:'13:00'}),booking('previous-start','2026-09-16',10),booking('previous-end','2026-09-30',30),booking('outside','2026-09-15',700)]});
test('future part of a selected period is capped and prior period uses the same observed length',()=>{
 const result=calculate(seed());
 assert.equal(result.observed,true);assert.equal(result.clipped,true);
 assert.deepEqual([result.current.start,result.current.end,result.current.days],['2026-10-01','2026-10-15',15]);
 assert.deepEqual([result.previous.start,result.previous.end,result.previous.days],['2026-09-16','2026-09-30',15]);
 assert.equal(result.current.completed,2);assert.equal(result.current.value,100);assert.equal(result.previous.completed,2);assert.equal(result.previous.value,40);
 assert.equal(result.series.length,15);assert.deepEqual(result.series[14].current,{date:'2026-10-15',completed:1,value:75});
 assert.deepEqual(result.changes.value,{absolute:60,percent:150});
});
test('past periods compare all selected days across year, DST and leap boundaries',()=>{
 for(const [start,end,expectedStart,expectedEnd,count] of [
  ['2026-03-23','2026-03-29','2026-03-16','2026-03-22',7],
  ['2026-10-19','2026-10-25','2026-10-12','2026-10-18',7],
  ['2024-02-28','2024-03-01','2024-02-25','2024-02-27',3],
  ['2027-01-01','2027-01-02','2026-12-30','2026-12-31',2]
 ]){const result=calculate({id:'one',staff:[],bookings:[]},{start,end,staff:'all'},'2027-02-01');assert.equal(result.clipped,false);assert.equal(result.series.length,count);assert.equal(new Set(result.series.map(p=>p.current.date)).size,count);assert.equal(result.previous.start,expectedStart);assert.equal(result.previous.end,expectedEnd);}
 const leap=calculate({id:'one',staff:[],bookings:[booking('leap','2024-02-29')]},{start:'2024-02-28',end:'2024-03-01',staff:'all'},'2024-03-02');assert.equal(leap.current.completed,1);
});
test('completed-only service values exclude cancelled, no-show, confirmed, deposits and simulated transactions',()=>{
 const s={id:'one',staff:[{id:'a'}],payments:{transactions:[{amount:999,net:888}]},bookings:[booking('real','2026-10-10',35,{deposit:20}),...['cancelled','no_show','no-show','confirmed'].map((status,i)=>booking('ignored'+i,'2026-10-10',500,{status}))]};
 const result=calculate(s);assert.equal(result.current.completed,1);assert.equal(result.current.value,35);assert.equal(result.current.averageValue,35);assert(!Object.hasOwn(result,'cash'));assert(!Object.hasOwn(result,'revenueCollected'));
});
test('all-staff includes deleted staff and removed service snapshots, while a specific unknown filter is empty',()=>{
 const s={id:'one',staff:[{id:'a'},{id:'b',active:false}],services:[],bookings:[booking('a','2026-10-01',10),booking('b','2026-10-01',20,{staffId:'b'}),booking('removed','2026-10-01',40,{staffId:'deleted',serviceId:'deleted-service',serviceName:'Removed treatment'})]};
 assert.equal(calculate(s).current.value,70);
 assert.equal(calculate(s,{start:'2026-10-01',end:'2026-10-31',staff:'b'}).current.value,20);
 assert.equal(calculate(s,{start:'2026-10-01',end:'2026-10-31',staff:'deleted'}).current.value,0);
 assert.equal(calculate(s).topService.name,'Removed treatment');
});
test('zero previous baseline exposes absolute changes without invented percentages',()=>{
 const s={id:'one',staff:[],bookings:[booking('one','2026-10-01',.1),booking('two','2026-10-01',.2)]},r=calculate(s);
 assert.equal(r.current.value,.3);assert.deepEqual(r.changes.value,{absolute:.3,percent:null});assert.deepEqual(r.changes.completed,{absolute:2,percent:null});assert.deepEqual(r.changes.averageValue,{absolute:null,percent:null});
 const fall=calculate({id:'one',staff:[],bookings:[booking('prior','2026-09-30',100)]});assert.deepEqual(fall.changes.value,{absolute:-100,percent:-100});
});
test('invalid and missing saved prices are explicit and do not corrupt averages',()=>{
 const s={id:'one',staff:[],bookings:[booking('priced','2026-10-02',25),...[NaN,Infinity,undefined,null,'',-5,1e308].map((price,i)=>booking('bad'+i,'2026-10-02',price))]};
 // The factory default treats undefined as25; this fixture deliberately removes it.
 delete s.bookings.find(b=>b.id==='bad2').price;
 const r=calculate(s);assert.equal(r.current.completed,8);assert.equal(r.current.pricedCompleted,1);assert.equal(r.current.missingPrices,7);assert.equal(r.current.value,25);assert.equal(r.current.averageValue,25);assert(!JSON.stringify(r).includes('Infinity'));
});
test('future-only, invalid and out-of-scope records cannot masquerade as observed performance',()=>{
 const s=seed();s.bookings.push(booking('bad-date','2026-02-31',999));
 const future=calculate(s,{start:'2026-12-01',end:'2026-12-10',staff:'all'});assert.equal(future.observed,false);assert.equal(future.current,null);assert.equal(future.previous,null);assert.deepEqual(future.series,[]);
 for(const filter of [{start:'2026-02-31',end:'2026-03-01'},{start:'2026-10-20',end:'2026-10-01'},{start:'2025-01-01',end:'2026-10-01'}])assert.throws(()=>calculate(s,filter),/valid comparison period/);
});
test('comparison is tenant-scoped, immutable and uncached across businesses',()=>{
 const s=seed();s.bookings.push(booking('foreign','2026-10-03',999,{salon_id:'other'}));const before=structuredClone(s);assert.equal(calculate(s).current.value,100);assert.deepEqual(s,before);
 const other={id:'other',staff:[],bookings:[booking('other','2026-10-03',14,{salonId:'other'})]};assert.equal(calculate(other).current.value,14);assert.equal(calculate(s).current.value,100);
});
function harness(plan='premium'){
 const state={...seed(),plan,entitlements:{plan},services:[],customers:[],workspace:{plan:'premium',appearance:{plan:'premium'}}},seen={renders:0,errors:[],writes:0};
 class FormData{constructor(form){this.form=form;}get(key){return this.form[key];}}
 const ctx={window:{},Date,Intl,FormData};vm.runInNewContext(scheduling,ctx);vm.runInNewContext(source,ctx);
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tools=ctx.window.JovaOwnerTools.create({salon:()=>state,render:()=>seen.renders++,esc:escape,money:n=>'£'+Number(n).toFixed(2),today:()=> '2026-10-15',addDays:(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);},error:(_,text)=>seen.errors.push(text),save:()=>seen.writes++});
 return {state,seen,tools};
}
test('Premium renderer exposes paired actual points, matched dates and controls without writing records',()=>{
 const {tools,state,seen}=harness(),before=structuredClone(state);let html=tools.pages.insights();
 assert(html.includes('data-client-visits'));assert(html.includes('data-premium-compare'));assert(html.includes('Showing the first 15 observed days'));assert.match(html,/16 Sept? 2026 to 30 Sept? 2026/);
 assert.equal((html.match(/data-current-date=/g)||[]).length,15);assert(html.includes('not collected cash'));assert(!html.includes('data-premium-locked'));
 tools.click('premium-compare-metric',{dataset:{metric:'completed'}});html=tools.pages.insights();assert(html.includes('data-compare-metric="completed"'));assert.match(html,/data-metric="completed" aria-pressed="true"[^>]*>Completed bookings/);
 assert.equal(seen.writes,0);assert.deepEqual(state,before);
});
test('Standard locked preview contains no Premium dataset or controls and forged toggles fail closed',()=>{
 const {tools,state,seen}=harness('standard');let html=tools.pages.insights();assert(html.includes('data-client-visits'));assert(html.includes('data-premium-locked'));assert(!html.includes('data-premium-series'));assert(!html.includes('data-premium-total'));assert(!html.includes('data-action="premium-compare-metric"'));
 const element={get dataset(){throw Error('Denied event must not parse its metric');}};assert.equal(tools.click('premium-compare-metric',element),true);assert.equal(seen.writes,0);
 state.plan='premium';html=tools.pages.insights();assert(html.includes('data-premium-locked'),'Verified Standard overrides the editable/display plan');
 state.entitlements.plan='essential';Object.defineProperty(state,'bookings',{get(){throw Error('Essential must not read analytics');}});assert(tools.pages.insights().includes('data-insights-upgrade'));assert.equal(tools.click('premium-compare-metric',element),true);
});
test('switching tenant or downgrading removes stale Premium state and resets the metric',()=>{
 const {tools,state}=harness();tools.pages.insights();tools.click('premium-compare-metric',{dataset:{metric:'completed'}});
 state.id='two';state.bookings=[];let html=tools.pages.insights();assert(html.includes('data-compare-metric="value"'));assert(html.includes('No completed bookings in either comparison period'));
 state.entitlements.plan='standard';html=tools.pages.insights();assert(html.includes('data-premium-locked'));assert(!html.includes('data-current-date='));
});
test('future-only filter renders an honest Premium empty state and no invented totals',()=>{
 const {tools}=harness();tools.pages.insights();tools.submit('owner-insights',{period:'custom',start:'2026-12-01',end:'2026-12-10',staff:'all'});const html=tools.pages.insights();assert(html.includes('This period has not started'));assert(!html.includes('data-premium-total'));assert(!html.includes('data-premium-series'));
});
