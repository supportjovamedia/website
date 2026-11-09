import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const filterSource=app.slice(app.indexOf('function bookingListMatches('),app.indexOf('function appointmentsPage(){'));
const context={};vm.runInNewContext(filterSource,context);
const matches=context.bookingListMatches,clock={date:'2026-11-09',minutes:600};
const record=(edit={})=>({name:'Alex Customer',email:'staff@example.test',serviceName:'Colour',serviceId:'colour',staffId:'sam',date:'2026-11-09',time:'11:00',status:'confirmed',...edit});
test('Booking tabs use actual business date, time and saved status',()=>{
 assert(matches(record({status:'completed'}),{tab:'today'},clock));
 assert(!matches(record({date:'2026-11-10'}),{tab:'today'},clock));
 assert(matches(record(),{tab:'upcoming'},clock));
 assert(!matches(record({time:'09:59'}),{tab:'upcoming'},clock));
 assert(!matches(record({status:'cancelled',date:'2026-11-10'}),{tab:'upcoming'},clock));
 assert(!matches(record({status:'completed',date:'2026-11-10'}),{tab:'upcoming'},clock));
 assert(matches(record({status:'completed',date:'2025-02-01'}),{tab:'completed'},clock));
 assert(matches(record({status:'cancelled',date:'2025-02-01'}),{tab:'cancelled'},clock));
});
test('Customer search matches only names and combines staff AND service filters',()=>{
 assert(matches(record(),{tab:'today',q:' ALEX '},clock));
 for(const q of ['staff@example.test','colour','sam'])assert(!matches(record(),{tab:'today',q},clock));
 const filter={tab:'today',staffIds:['sam','jordan'],serviceIds:['colour','cut']};
 assert(matches(record(),filter,clock));
 assert(!matches(record({staffId:'ella'}),filter,clock));
 assert(!matches(record({serviceId:'nails'}),filter,clock));
 assert(matches(record(),{tab:'today',staffIds:[],serviceIds:[]},clock));
});
const source=await readFile(new URL('../booking-filters.js',import.meta.url),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function harness(){
 const context={window:{}};vm.runInNewContext(source,context);let owner='a',html='',title='',closed=0,renders=0,modals=0;
 const applied={staffIds:[],serviceIds:[]},salon={id:'s',staff:[{id:'sam',name:'Sam <Taylor>'},{id:'jordan',name:'Jordan'}],categories:[{id:'hair',name:'Hair'}],services:[{id:'cut',name:'Cut',categoryId:'hair'},{id:'colour',name:'Colour',categoryId:'hair'},{id:'other',name:'Other',categoryId:''}]};
 const tools=context.window.JovaBookingFilters.create({salon:()=>salon,filter:()=>applied,ownerIdentity:()=>owner,esc,modal:(name,body)=>{title=name;html=body;modals++;},closeModal:()=>closed++,render:()=>renders++});
 const change=(kind,id,checked)=>tools.change({dataset:{bkfKind:kind},value:id,checked,closest:()=>({dataset:{owner:'a|s'}})});
 return {tools,applied,change,get html(){return html;},get title(){return title;},get closed(){return closed;},get renders(){return renders;},get modals(){return modals;},switchOwner:()=>owner='b'};
}
test('Staff and service draft stays private until Apply, categories support partial selection',()=>{
 const h=harness();h.tools.click('bookings-filters',{});assert.equal(h.title,'Filter bookings');
 h.tools.click('bkf-staff',{});h.change('staff','sam',true);assert.deepEqual(h.applied.staffIds,[]);assert.equal(h.modals,2,'Selecting a checkbox does not replace the modal');assert(h.html.includes('Sam &lt;Taylor&gt;'));
 h.tools.click('bkf-done',{});assert(h.html.includes('1 staff selected'));h.tools.click('bkf-services',{});const opened=h.modals;h.change('category','hair',true);assert.equal(h.modals,opened,'Category selection does not rebuild the picker');assert(h.html.includes('Other services'));
 h.change('service','colour',false);h.tools.click('bkf-expand',{dataset:{category:'hair'}});assert.equal(h.modals,opened,'Expanding the category does not replace the modal');h.tools.click('bkf-done',{});h.tools.click('bkf-services',{});assert(h.html.includes('data-partial="true"'));assert(h.html.includes('value="cut" checked'));assert(!h.html.includes('value="colour" checked'));
 h.tools.click('bkf-done',{});h.tools.click('bkf-apply',{});assert.deepEqual(Array.from(h.applied.staffIds),['sam']);assert.deepEqual(Array.from(h.applied.serviceIds),['cut']);assert.equal(h.closed,1);assert.equal(h.renders,1);
});
test('Reopening discards unapplied edits, Clear all resets both filters only on Apply',()=>{
 const h=harness();h.applied.staffIds=['sam'];h.applied.serviceIds=['colour'];h.tools.click('bookings-filters',{});h.tools.click('bkf-staff',{});h.change('staff','jordan',true);h.tools.click('bookings-filters',{});assert(h.html.includes('1 staff selected'));h.tools.click('bkf-clear-all',{});assert.deepEqual(h.applied.staffIds,['sam']);h.tools.click('bkf-apply',{});assert.equal(h.applied.staffIds.length,0);assert.equal(h.applied.serviceIds.length,0);
});
test('Changing business identity invalidates the open filter draft',()=>{
 const h=harness();h.tools.click('bookings-filters',{});h.tools.click('bkf-staff',{});h.change('staff','sam',true);h.switchOwner();h.tools.click('bkf-apply',{});assert.deepEqual(h.applied.staffIds,[]);assert.equal(h.closed,0);
});
