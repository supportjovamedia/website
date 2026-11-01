import test from 'node:test';
import assert from 'node:assert/strict';
import {jovaBookCommission} from '../../lib/jovabook-commission.mjs';
test('approved monthly commission rates apply to the full booking service price',()=>{
 assert.equal(jovaBookCommission('essential',5000).amount,50,'50GBP service costs50p even if only10GBP deposit was paid');
 assert.equal(jovaBookCommission('standard',5000).amount,50);
 assert.equal(jovaBookCommission('premium',5000).amount,0);
 assert.equal(jovaBookCommission('standard',500000).amount,5000,'50GBP fee at5000GBP booked service value equals Standard to Premium monthly price difference');
});
test('fees round deterministically to the nearest penny without floating point drift',()=>{
 assert.equal(jovaBookCommission('essential',49).amount,0);
 assert.equal(jovaBookCommission('essential',50).amount,1);
 assert.equal(jovaBookCommission('standard',149).amount,1);
 assert.equal(jovaBookCommission('standard',150).amount,2);
});
test('unverified plans and invalid amounts cannot silently get zero commission',()=>{
 for(const plan of ['pro','Premium','__proto__',undefined])assert.throws(()=>jovaBookCommission(plan,1000));
 for(const amount of [-1,1.5,NaN,Infinity,'1000',100000000])assert.throws(()=>jovaBookCommission('essential',amount));
 const snapshot=jovaBookCommission('essential',10000);assert(Object.isFrozen(snapshot));assert.equal(snapshot.amount,100);
});
