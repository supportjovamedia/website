import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context = {window:{}};
vm.runInNewContext(await readFile(new URL('../dashboard-core.js',import.meta.url),'utf8'),context);
const {range,summary,normalizeAnchor,shift,inRange} = context.window.JovaDashboard;
const plain = value => JSON.parse(JSON.stringify(value));
test('day, Monday-based week and calendar month include correct boundaries',()=>{
 assert.deepEqual(plain(range('2026-12-31','day').days),['2026-12-31']);
 const week=range('2027-01-03','week');assert.equal(week.start,'2026-12-28');assert.equal(week.end,'2027-01-03');assert.equal(week.days.length,7);assert(week.label.includes('2026')&&week.label.includes('2027'));
 const monday=range('2026-11-02','week');assert.equal(monday.start,'2026-11-02');assert.equal(monday.end,'2026-11-08');
 const leap=range('2024-02-29','month');assert.equal(leap.start,'2024-02-01');assert.equal(leap.end,'2024-02-29');assert.equal(leap.days.length,29);
 assert.equal(range('2100-02-05','month').days.length,28);assert.equal(range('2026-12-05','month').end,'2026-12-31');
 assert.throws(()=>range('2026-02-29','day'),/valid calendar date/);assert.throws(()=>range('2026-10-31','year'),/day, week or month/);
});
test('date arithmetic is continuous through both UK DST changes',()=>{
 const spring=range('2026-03-29','week');assert.equal(spring.start,'2026-03-23');assert.equal(spring.end,'2026-03-29');assert.equal(new Set(spring.days).size,7);
 const autumn=range('2026-10-25','week');assert.equal(autumn.start,'2026-10-19');assert.equal(autumn.end,'2026-10-25');assert.equal(new Set(autumn.days).size,7);
 assert.equal(range('2026-03-29','month').days.length,31);assert.equal(range('2026-10-25','month').days.length,31);
});

test('period pickers normalize weeks to Monday and accept actual calendar month values only',()=>{
 assert.equal(normalizeAnchor('2027-01-03','week'),'2026-12-28');
 assert.equal(normalizeAnchor('2026-11-04','week'),'2026-11-02');
 assert.equal(normalizeAnchor('2024-02','month'),'2024-02-01');
 assert.equal(normalizeAnchor('2024-02-29','day'),'2024-02-29');
 for(const invalid of ['','2026-13','2026-00','2026-02-29','2026-03-32'])assert.throws(()=>normalizeAnchor(invalid,'month'),/valid calendar date/);
 assert.throws(()=>normalizeAnchor('2026-11-04','custom'),/day, week or month/);
 const label=range('2027-01-03','week').label;assert(label.includes('Monday')&&label.includes('Sunday')&&label.includes('2026')&&label.includes('2027'));
});

test('previous and next periods preserve calendar boundaries across leap years, year changes and DST',()=>{
 assert.equal(shift('2024-01-31','month',1),'2024-02-01');
 assert.equal(range(shift('2024-01-31','month',1),'month').end,'2024-02-29');
 assert.equal(shift('2026-03-31','month',-1),'2026-02-01');
 assert.equal(shift('2026-12-31','month',1),'2027-01-01');
 assert.equal(shift('2027-01-31','month',-1),'2026-12-01');
 assert.equal(shift('2024-02-28','day',1),'2024-02-29');
 assert.equal(shift('2024-03-01','day',-1),'2024-02-29');
 assert.equal(shift('2026-03-29','day',1),'2026-03-30');
 assert.equal(shift('2026-10-25','day',1),'2026-10-26');
 assert.equal(shift('2026-03-29','week',1),'2026-03-30');
 assert.equal(shift('2026-10-25','week',1),'2026-10-26');
 assert.equal(shift('2027-01-03','week',1),'2027-01-04');
 assert.throws(()=>shift('2026-11-04','week',0),/previous or next/);
});

test('list membership uses the same validated inclusive period as the metrics',()=>{
 const period=range('2026-10-20','month');
 for(const date of [period.start,period.end])assert(inRange(period,date));
 for(const date of ['2026-09-30','2026-11-01','2026-10-20garbage','2026-10-00','2026-10-32',null])assert.equal(inRange(period,date),false);
});
const fixture=()=>({staff:[{id:'a',active:true},{id:'b',active:false}],services:[{id:'cut',price:999}],bookings:[
 {id:'one',date:'2026-10-31',time:'09:00',staffId:'a',serviceId:'cut',status:'confirmed',price:25,deposit:10},
 {id:'two',date:'2026-10-31',time:'10:00',staffId:'a',serviceId:'cut',status:'completed',price:'50.10',deposit:20},
 {id:'three',date:'2026-10-31',time:'11:00',staffId:'b',status:'completed',price:10.20,deposit:5},
 {id:'four',date:'2026-10-31',time:'12:00',staffId:'a',status:'cancelled',price:300},
 {id:'five',date:'2026-10-31',time:'13:00',staffId:'a',status:'no_show',price:500},
 {id:'six',date:'2026-10-31',time:'14:00',staffId:'a',status:'no-show',price:500},
 {id:'seven',date:'2026-10-31',time:'15:00',staffId:'a',status:'pending',price:500},
 {id:'before',date:'2026-10-25',staffId:'a',status:'completed',price:15},
 {id:'after',date:'2026-11-01',staffId:'a',status:'completed',price:30}
 ],payments:{transactions:[{bookingId:'two',amount:1000,net:900,method:'demo'}]}});
test('metrics use saved service dates, statuses and prices without counting deposits or simulated payments',()=>{
 const result=summary(fixture(),{date:'2026-10-31',view:'day',staffIds:null});
 assert.deepEqual(plain({...result,range:undefined}),{booked:3,confirmed:1,completed:2,cancelled:1,noShow:2,completedValue:60.3,scheduledValue:85.3});
 assert.equal(summary(fixture(),{date:'2026-10-31',view:'week'}).completedValue,90.3,'Week includes its Sunday boundary');
 assert.equal(summary(fixture(),{date:'2026-10-31',view:'month'}).completedValue,75.3,'Month includes October history but excludes November');
 assert(!Object.hasOwn(result,'payments'));assert(!Object.hasOwn(result,'collectedRevenue'));
});
test('all metrics follow selected roster IDs, including inactive staff, empty and unknown selections',()=>{
 const s=fixture(),options={date:'2026-10-31',view:'day'};
 const a=summary(s,{...options,staffIds:['a']});assert.equal(a.booked,2);assert.equal(a.completedValue,50.1);assert.equal(a.cancelled,1);assert.equal(a.noShow,2);
 const b=summary(s,{...options,staffIds:['b']});assert.equal(b.booked,1);assert.equal(b.completedValue,10.2);assert.equal(b.cancelled,0);assert.equal(b.noShow,0);
 for(const staffIds of [[],['unknown']]){const result=summary(s,{...options,staffIds});for(const field of ['booked','confirmed','completed','cancelled','noShow','completedValue','scheduledValue'])assert.equal(result[field],0);}
 assert.equal(summary(s,{...options,staffIds:['a','a','unknown']}).booked,2,'Duplicate filters do not duplicate bookings');
 s.bookings.push({id:'former',staffId:'removed',date:'2026-10-31',status:'completed',price:5});
 assert.equal(summary(s,{...options,staffIds:null}).completedValue,65.3,'All-staff totals retain historical former-staff appointments');
 assert.equal(summary(s,{...options,staffIds:['removed']}).completedValue,0,'An unknown roster filter selects no appointments');
});
test('nonfinite values and invalid dates cannot corrupt totals, and source records stay unchanged',()=>{
 const s=fixture();s.bookings.push(...[NaN,Infinity,-1,'not-a-price',undefined].map((price,i)=>({id:'invalid-'+i,date:'2026-10-31',staffId:'a',status:'completed',price})),{id:'invalid-date',date:'2026-10-32',staffId:'a',status:'completed',price:999});
 const before=structuredClone(s);const result=summary(s,{date:'2026-10-31',view:'day'});
 assert.equal(result.completedValue,60.3);assert.equal(result.scheduledValue,85.3);assert.equal(result.completed,7);
 assert.deepEqual(s,before);
 result.range.days.push('2099-01-01');assert.equal(range('2026-10-31','day').days.length,1,'Returned ranges share no mutable state');
});
