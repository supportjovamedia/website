import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerBookings} from '../lib/booking/customer-view.mjs';
const now=Date.parse('2026-10-10T12:00:00Z');
const appointment=(id,hours,status='confirmed')=>({id,status,starts_at:new Date(now+hours*3600000).toISOString()});

test('upcoming appointments contain only future confirmed bookings in date order',()=>{
 const {upcoming}=customerBookings([appointment(1,48),appointment(2,-2),appointment(3,24),appointment(4,72,'cancelled'),appointment(5,0)],now);
 assert.deepEqual(upcoming.map(b=>b.id),[3,1]);
});
test('history shows the latest five past or cancelled appointments without mutating records',()=>{
 const bookings=Array.from({length:8},(_,i)=>appointment(i,-i-1));
 bookings.push(appointment(9,24,'cancelled'),appointment(10,48));
 const original=structuredClone(bookings);
 const {history}=customerBookings(bookings,now);
 assert.deepEqual(history.map(b=>b.id),[9,0,1,2,3]);
 assert.deepEqual(bookings,original);
});
test('empty booking lists produce separate empty upcoming and history lists',()=>{
 assert.deepEqual(customerBookings([],now),{upcoming:[],history:[]});
});
