import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deploymentBusiness} from '../lib/booking/business.mjs';
import {scope,ownership,recordColumns} from '../lib/booking/store.mjs';

function client(results){const calls=[];return {calls,from(table){calls.push(table);return {select(){return this;},eq(){return this;},single(){return Promise.resolve(results[table]);}};}};}

test('installed single-salon settings prevent fallback to legacy business data',async()=>{
 const c=client({salon_settings:{data:{id:3},error:null}});
 const salon=await deploymentBusiness(c);
 assert.equal(salon.single,true);assert.deepEqual(c.calls,['salon_settings']);
 const query={eq(){throw Error('A single-salon query must not add a tenant predicate');}};
 assert.equal(scope(query,salon),query);assert.deepEqual(ownership(salon),{});
 assert.equal(recordColumns('id,business_id,name',salon),'id,name');
});

test('compatibility fallback is allowed only when the settings table is absent',async()=>{
 const absent=client({salon_settings:{data:null,error:{code:'PGRST205'}},businesses:{data:{id:3,slug:'north-and-co'},error:null}});
 assert.equal((await deploymentBusiness(absent)).single,false);
 for(const code of ['PGRST116','42501','08006']){
  const broken=client({salon_settings:{data:null,error:{code}}});
  await assert.rejects(deploymentBusiness(broken),e=>e.status===503);
  assert.deepEqual(broken.calls,['salon_settings']);
 }
});
