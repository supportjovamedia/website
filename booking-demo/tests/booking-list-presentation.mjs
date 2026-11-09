import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../workspace.js',import.meta.url),'utf8');
const reference=source.slice(source.indexOf('/* Reference-led owner presentation.'),source.indexOf('/* vanilla-colorful'));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function setup(){
 const context={window:{}};vm.runInNewContext(reference,context);
 const state={bookings:[],staff:[{id:'sam',name:'Sam Taylor'}]};
 return context.window.JovaReference.create({salon:()=>state,esc,money:value=>'£'+Number(value).toFixed(2),humanDate:value=>'Date '+value});
}
const record=(id,status='confirmed')=>({id,name:'Alex Customer',serviceName:'Cut and finish',staffId:'sam',duration:45,date:'2026-11-09',time:'14:30',price:25,status});

test('compact booking list retains actual data and existing detail and edit actions',()=>{
 const list=[record('booking-1')],before=structuredClone(list);
 const html=setup().bookings({list,total:23,query:'Alex',filters:'<select data-change="appt-filter"></select>',pager:'<nav>Page 1 of 2</nav>'});
 for(const text of ['Alex Customer','Cut and finish','Date 2026-11-09','14:30','45 min','Sam Taylor','£25.00','Confirmed'])assert(html.includes(text));
 assert(html.includes('23 bookings'));
 assert(html.includes('id="appt-search"'));assert(html.includes('value="Alex"'));
 assert(html.includes('data-action="bookings-filters"'));assert(html.includes('<nav>Page 1 of 2</nav>'));
 assert(html.includes('placeholder="Search customer name"'));assert(!html.includes('Search customer or service'));
 assert.equal((html.match(/data-action="bookings-tab"/g)||[]).length,4);
 assert(html.includes('data-value="today" aria-pressed="true"'));
 for(const action of ['booking-details','edit-booking'])assert(html.includes('data-action="'+action+'" data-id="booking-1"'));
 assert(html.includes('popover="auto"'));assert(!html.includes('rf-avatar'));
 assert.deepEqual(list,before);
});

test('status and customer fields are escaped without creating invented booking states',()=>{
 const html=setup().bookings({list:[{...record('x" onclick="bad'),name:'<img src=x onerror=bad>',serviceName:'<script>bad</script>',status:'<script>bad</script>'}]});
 assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(html.includes('&lt;img'));
 assert(html.includes('is-other'));assert(html.includes('data-id="x&quot; onclick=&quot;bad"'));
 for(const status of ['confirmed','completed','cancelled','no-show'])assert(setup().bookings({list:[record('b',status)]}).includes('is-'+status));
});

test('empty filtered list has no table row or duplicate create action',()=>{
 const html=setup().bookings({list:[],total:20,query:'missing'});
 assert(html.includes('No bookings to show'));assert(!html.includes('<table>'));
 assert.equal((html.match(/data-action="new-booking"/g)||[]).length,1);
 assert(html.includes('value="missing"'));assert(!html.includes('>0</span>'));
});
