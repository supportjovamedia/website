import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const core=await readFile(new URL('../dashboard-core.js',import.meta.url),'utf8'),source=await readFile(new URL('../dashboard-date-picker.js',import.meta.url),'utf8');
function harness(extra={}){const window={...extra.window};const context={window,Date,Intl,...extra};vm.runInNewContext(core,context);vm.runInNewContext(source,context);return {picker:window.JovaDatePicker,dashboard:window.JovaDashboard};}
const config={anchor:'2026-11-09',view:'week',today:'2026-11-09'};
test('custom dates stage a full selected period without changing the committed anchor',()=>{
 const {picker,dashboard}=harness();
 for(const [view,expected] of [['day','2026-11-18'],['week','2026-11-16'],['month','2026-11-01']]){
  const state=picker.createState({...config,view});picker.choose(state,'2026-11-18');assert.equal(state.selection,expected);assert.equal(state.anchor,dashboard.normalizeAnchor(config.anchor,view));
 }
 const state=picker.createState(config);state.custom=true;const html=picker.menu(state);assert.equal((html.match(/data-date-picker="day"/g)||[]).length,42);assert.equal((html.match(/class="[^"]*is-in-range/g)||[]).length,7);assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
});
test('relative presets and displayed ranges survive month, leap-day and year boundaries',()=>{
 const {picker}=harness();assert.deepEqual(Array.from(picker.presets('2026-12-31','day'),row=>Array.from(row)),[['Today','2026-12-31'],['Tomorrow','2027-01-01'],['Yesterday','2026-12-30']]);
 assert.equal(picker.rangeLabel('2026-12-31','week'),'28 Dec 2026 to 3 Jan 2027');assert.equal(picker.rangeLabel('2028-02-20','month'),'1 Feb to 29 Feb 2028');
 const state=picker.createState({...config,anchor:'2027-01-05'});picker.shiftMonth(state,-1);assert.equal(state.month,'2026-12');assert.equal(state.selection,'2027-01-04');
 state.month='9999-12';state.custom=true;assert.doesNotThrow(()=>picker.menu(state));state.month='0001-01';assert.doesNotThrow(()=>picker.menu(state));
});
test('Dashboard and Calendar get the same selector and the selected week matches its actual totals',()=>{
 const {picker,dashboard}=harness(),dashboardMarkup=picker.markup({...config,context:'dashboard'}),calendarMarkup=picker.markup({...config,context:'calendar'});
 assert.equal(dashboardMarkup.replace('data-picker-context="dashboard"','data-picker-context="calendar"').replace('Choose dashboard date','Choose calendar date'),calendarMarkup);
 const state=picker.createState(config);picker.choose(state,'2026-11-20');const summary=dashboard.summary({staff:[],bookings:[{date:'2026-11-15',status:'confirmed',price:10},{date:'2026-11-16',status:'confirmed',price:20},{date:'2026-11-22',status:'completed',price:30},{date:'2026-11-23',status:'confirmed',price:40}]},{date:state.selection,view:state.view});assert.equal(summary.booked,2);assert.equal(summary.scheduledValue,50);assert.equal(summary.range.start,'2026-11-16');assert.equal(summary.range.end,'2026-11-22');
});
function events(){
 const listeners={},sent=[],content={innerHTML:''},summary={getBoundingClientRect:()=>({bottom:200}),focus(){}},pickerNode={dataset:{pickerAnchor:'2026-11-09',pickerView:'week',pickerToday:'2026-11-09',pickerContext:'calendar'},open:true,style:{setProperty(){}},matches:()=>true,contains:()=>false,querySelector:selector=>selector==='summary'?summary:selector==='.jg-date-menu'?content:selector.startsWith('[aria-controls=')?selector==='[aria-controls="owned-month-list"]'?{}:null:{focus(){}}};
 const document={addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>null,querySelectorAll:()=>pickerNode.open?[pickerNode]:[],dispatchEvent:event=>sent.push(event)};
 harness({document,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},window:{innerHeight:844,addEventListener(){}}});
 function click(action,date){const button={tagName:'BUTTON',dataset:{datePicker:action,date},closest:()=>pickerNode};listeners.click({target:{closest:()=>button},preventDefault(){}});}
 return {click,listeners,sent,content,pickerNode,document};
}
test('preset and custom drafts apply only on Apply, and closing restores the committed selection',()=>{
 const ui=events();ui.click('preset','2026-11-16');assert.equal(ui.sent.length,0);ui.listeners.pointerdown({target:{}});ui.pickerNode.open=true;ui.listeners.toggle({target:ui.pickerNode});ui.click('apply');assert.equal(ui.sent[0].detail.anchor,'2026-11-09');
 const custom=events();custom.click('custom');custom.click('day','2026-11-20');assert.equal(custom.sent.length,0);custom.click('apply');assert.equal(custom.sent[0].detail.anchor,'2026-11-16');assert.equal(custom.sent[0].detail.context,'calendar');
});
test('Clear disables Apply until a new date is selected and Escape preserves the committed date',()=>{
 const ui=events();ui.click('custom');ui.click('clear');assert.match(ui.content.innerHTML,/data-date-picker="apply" disabled/);ui.click('apply');assert.equal(ui.sent.length,0);
 ui.click('day','2026-11-23');const target={closest:()=>ui.pickerNode};ui.listeners.keydown({key:'Escape',target,preventDefault(){},stopImmediatePropagation(){}});assert.equal(ui.pickerNode.open,false);ui.pickerNode.open=true;ui.listeners.toggle({target:ui.pickerNode});ui.click('apply');assert.equal(ui.sent[0].detail.anchor,'2026-11-09');
});

test('the owned month-select portal stays inside the date interaction and changing month preserves the staged selection',()=>{
 const ui=events();ui.click('custom');ui.click('month-chooser');const popup={id:'owned-month-list'};ui.listeners.pointerdown({target:{closest:()=>popup}});assert.equal(ui.pickerNode.open,true);
 ui.listeners.change({target:{dataset:{datePicker:'month-select'},value:'12',closest:()=>ui.pickerNode}});assert.match(ui.content.innerHTML,/December 2026/);assert.match(ui.content.innerHTML,/9 Nov to 15 Nov 2026/);assert.equal(ui.sent.length,0);
 ui.document.querySelector=()=>popup;ui.listeners.keydown({key:'Escape',target:{closest:()=>ui.pickerNode},preventDefault(){throw Error('Date picker must not consume combobox Escape');},stopImmediatePropagation(){}});assert.equal(ui.pickerNode.open,true);
 ui.click('day','2026-12-16');ui.click('apply');assert.equal(ui.sent[0].detail.anchor,'2026-12-14');
});
