import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={window:{},Date,Intl};
vm.runInNewContext(await readFile(new URL('../demo-data.js',import.meta.url),'utf8'),context);
vm.runInNewContext(await readFile(new URL('../scheduling-core.js',import.meta.url),'utf8'),context);
const {build,populate}=context.window.JovaDemoData,schedule=context.window.JovaSchedule;
const at='2026-10-31T13:30:00Z',plain=value=>JSON.parse(JSON.stringify(value));
const mins=value=>Number(value.slice(0,2))*60+Number(value.slice(3));

test('sample studio is deterministic, rich and browser-only by construction',()=>{
 const sample=build({at});assert.deepEqual(plain(sample),plain(build({at})));
 assert.equal(sample.id,'drink');assert.equal(sample.slug,'jova-demo');assert.equal(sample.staff.length,4);assert.equal(sample.services.length,8);assert.equal(sample.customers.length,40);assert(sample.bookings.length>=220&&sample.bookings.length<=300);assert.equal(sample.emails.length,24);
 assert.equal(sample.plan,'standard');assert.equal(schedule.plan(sample).staffLimit,5);assert.match(sample.demo.label,/Sample.*preview/);assert.equal(sample.payments.enabled,false);assert.deepEqual(plain(sample.payments.transactions),[]);assert.deepEqual(plain(sample.sms),[]);
 for(const client of sample.customers)assert(client.email.endsWith('@jovabook.example.test'));
 const statuses=new Set(sample.bookings.map(b=>b.status));for(const status of ['confirmed','completed','cancelled','no_show'])assert(statuses.has(status));
 const today=sample.bookings.filter(b=>b.date===sample.demo.sampleAnchor);assert(today.length>=8);assert(new Set(today.map(b=>b.staffId)).size>=3);assert(new Set(today.map(b=>b.serviceId)).size>=5);
 assert(sample.bookings.some(b=>b.date<sample.demo.sampleAnchor));assert(sample.bookings.some(b=>b.date>sample.demo.sampleAnchor));
});

test('every generated booking fits real staff/service hours and calendar blocks do not overlap',()=>{
 for(const date of ['2026-10-31T13:30:00Z','2026-11-01T13:30:00Z','2026-03-29T11:00:00Z']){
  const sample=build({at:date}),dates=new Set(sample.bookings.map(b=>b.date));
  for(const booking of sample.bookings){const member=sample.staff.find(m=>m.id===booking.staffId),service=sample.services.find(s=>s.id===booking.serviceId),hours=schedule.hoursFor(sample,member,booking.date);assert(member&&service);assert(service.staffIds.includes(member.id));assert(!hours.closed);assert(mins(booking.time)>=mins(hours.start));assert(mins(booking.time)+booking.duration<=mins(hours.end));assert(sample.customers.some(c=>c.id===booking.customerId));}
  for(const key of dates){const rows=sample.bookings.filter(b=>b.date===key&&b.status!=='cancelled').sort((a,b)=>a.time.localeCompare(b.time));for(let i=1;i<rows.length;i++)assert(mins(rows[i].time)>=mins(rows[i-1].time)+rows[i-1].duration,key+' has overlapping calendar blocks');}
 }
});

test('sample notifications are tied to actual demo bookings with mixed kinds',()=>{
 const sample=build({at}),kinds=new Set(sample.emails.map(e=>e.kind));for(const kind of ['confirmed','cancelled','rescheduled'])assert(kinds.has(kind));
 for(const event of sample.emails){const booking=sample.bookings.find(b=>b.id===event.booking.id);assert(booking);assert.equal(event.booking.name,booking.name);assert.equal(event.booking.serviceName,booking.serviceName);assert(Number.isFinite(Date.parse(event.at)));assert(Date.parse(event.at)<Date.parse(at));assert.equal(event.status,'Demo preview only');if(event.kind==='cancelled')assert.equal(booking.status,'cancelled');}
 assert.equal(new Set(sample.emails.map(e=>e.id)).size,sample.emails.length);
});

test('upgrading the old demo preserves edits and existing bookings, and seeds only once',()=>{
 const old={id:'drink',slug:'jova-demo',name:'My customised demo',hours:{start:'11:00',end:'16:00',days:[1,2,3,4,5,6]},staff:[{id:'owner',name:'My owner',active:true,color:'#123456',hours:null}],services:[{id:'brows',name:'My custom brow service',price:31,duration:30,staffIds:['owner']}],customers:[{id:'keep-client',name:'Keep me',email:'keep@example.test'}],bookings:[{id:'keep-booking',name:'Keep me',date:'2026-10-31',time:'12:00',duration:60,staffId:'owner',serviceId:'brows',customerId:'keep-client',status:'confirmed'}],emails:[{id:'keep-update',kind:'confirmed',at,booking:{id:'keep-booking'}}],payments:{enabled:false,deposit:0,transactions:[]},workspace:{appearance:{accent:'#6d4777'}},subscription:{status:'cancelled',method:'Keep me'}};
 const originals=plain(old),result=populate(old,{at});assert(result.applied);assert.equal(old.name,originals.name);assert.deepEqual(plain(old.hours),originals.hours);assert.deepEqual(plain(old.workspace),originals.workspace);assert.deepEqual(plain(old.staff[0]),originals.staff[0]);assert.deepEqual(plain(old.services[0]),originals.services[0]);assert.deepEqual(plain(old.bookings[0]),originals.bookings[0]);assert.deepEqual(plain(old.emails[0]),originals.emails[0]);assert.equal(old.subscription.status,'cancelled');assert.equal(old.subscription.method,'Keep me');assert.equal(result.added.staff,3);
 const today=old.bookings.filter(b=>b.date==='2026-10-31'&&b.id!=='keep-booking');for(const booking of today)assert(!(mins(booking.time)<13*60&&mins(booking.time)+booking.duration>12*60));
 old.staff[0].name='Edited after loading';old.bookings[0].time='14:00';const snapshot=JSON.stringify(old);assert.equal(populate(old,{at:'2026-12-31T12:00:00Z'}).applied,false);assert.equal(JSON.stringify(old),snapshot);
});

test('other salons and accounts are never changed, even with fresh mode',()=>{
 for(const salon of [{id:'abcd1234-abcd-4000-8000-abcd12345678',slug:'jova-demo',name:'Real tenant'},{id:'drink',slug:'other-business',name:'Another business'},{id:'other',slug:'jova-demo',name:'Another record'}]){const before=JSON.stringify(salon);assert.equal(populate(salon,{at,fresh:true}).applied,false);assert.equal(JSON.stringify(salon),before);}
 assert.equal(populate(null,{at}).applied,false);
});

test('invalid dates fail before mutation and London dates respect both DST boundaries',()=>{
 const sample={id:'drink',slug:'jova-demo'},before=JSON.stringify(sample);assert.throws(()=>populate(sample,{at:'bad'}),/valid sample-data date/);assert.equal(JSON.stringify(sample),before);
 assert.equal(build({at:'2026-03-29T23:30:00Z'}).demo.sampleAnchor,'2026-03-30');assert.equal(build({at:'2026-10-25T00:30:00Z'}).demo.sampleAnchor,'2026-10-25');assert.equal(build({at:'2026-10-25T23:30:00Z'}).demo.sampleAnchor,'2026-10-25');
});
