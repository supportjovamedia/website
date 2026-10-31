import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={window:{}};
vm.runInNewContext(await readFile(new URL('../reschedule-core.js',import.meta.url),'utf8'),context);
const {times}=context.window.JovaReschedule;
const booking={id:'bk_real',serviceId:'cut',serviceName:'Original haircut',duration:60,price:25,staffId:'owner',date:'2030-01-07',time:'09:00'};
const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
// A deterministic availability engine with the production slotsFor signature.
const slotsFor=(salon,member,date,service,ignore)=>{
 const out=[];
 for(let t=540;t+service.duration<=720;t+=30){
  if(!salon.bookings.some(b=>b.id!==ignore&&b.staffId===member.id&&b.date===date&&b.status!=='cancelled'&&t<minutes(b.time)+b.duration&&t+service.duration>minutes(b.time)))out.push(`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
 }
 return out;
};
const salon=bookings=>({staff:[{id:'owner',active:true}],services:[{id:'cut',duration:30}],bookings});
test('changed service duration retains the appointment snapshot and owner ID exclusion',()=>{
 const s=salon([{...booking,status:'confirmed'},{id:'other',staffId:'owner',date:booking.date,time:'10:00',duration:30,status:'confirmed'}]);
 assert.deepEqual([...times(s,booking,booking.date,slotsFor)],['09:00','10:30','11:00']);
});
test('public original slot is available while every other conflict is preserved',()=>{
 const s=salon([{...booking,id:'busy_own',status:'confirmed'},{id:'busy_other',staffId:'owner',date:booking.date,time:'10:00',duration:30,status:'confirmed'}]);
 const before=JSON.stringify(s);
 assert.deepEqual([...times(s,booking,booking.date,slotsFor)],['09:00','10:30','11:00']);
 assert.equal(JSON.stringify(s),before,'Source salon and booking records are unchanged');
 assert.equal(booking.duration,60);
});
test('only one matching anonymous interval is excluded',()=>{
 const s=salon([{...booking,id:'busy_one',status:'confirmed'},{...booking,id:'busy_two',status:'confirmed'}]);
 assert.deepEqual([...times(s,booking,booking.date,slotsFor)],['10:00','10:30','11:00']);
 const owner=salon([{...booking,status:'confirmed'},{...booking,id:'busy_other',status:'confirmed'}]);
 assert.deepEqual([...times(owner,booking,booking.date,slotsFor)],['10:00','10:30','11:00'],'A real owner record means matching anonymous conflicts must remain');
});
test('removed service remains reschedulable with current staff and rules',()=>{
 const s={...salon([]),services:[]};
 assert.equal(times(s,booking,booking.date,slotsFor)[0],'09:00');
 s.staff[0].active=false;
 assert.deepEqual([...times(s,booking,booking.date,slotsFor)],[]);
 assert.deepEqual([...times({...s,staff:[]},booking,booking.date,slotsFor)],[]);
});
