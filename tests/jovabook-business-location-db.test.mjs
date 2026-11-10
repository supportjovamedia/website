import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
test('signup location controls address validation without relaxing owner or phone guards',async()=>{
 const db=new PGlite();try{
  await bootstrap(db,await sources());const q=(sql,args=[])=>db.query(sql,args),owner=(await q('select owner_id,id,settings from public.salons order by id limit 1')).rows[0];
  await q("select set_config('request.jwt.claim.sub',$1,false)",[owner.owner_id]);
  for(const [locations,required] of [[['mobile'],false],[['online'],false],[['mobile','online'],false],[['physical'],true],[['mobile','physical'],true],[[],true]]){
   await q("insert into jovabook_private.owner_onboarding(user_id,data,steps) values($1,$2,'{}') on conflict(user_id) do update set data=excluded.data",[owner.owner_id,{service_locations:locations}]);
   assert.equal((await q('select jovabook_private.business_address_required($1) value',[owner.owner_id])).rows[0].value,required);
   const access=(await q('select public.owner_account_access() value')).rows[0].value;assert.equal(access.address_required,required);
   await q("update public.salons set status='setup' where id=$1",[owner.id]);
   const save=()=>q('select jovabook_private.billing_original_save_setup($1,$2,$3)',['','+447700900123',owner.settings]);
   if(required)await assert.rejects(save(),/business address/);else{await save();assert.equal((await q('select address from public.salons where id=$1',[owner.id])).rows[0].address,'');}
   await assert.rejects(q('select jovabook_private.billing_original_save_setup($1,$2,$3)',['24 High Street','bad',{}]),/phone/);
  }
  await q('delete from jovabook_private.owner_onboarding where user_id=$1',[owner.owner_id]);assert.equal((await q('select jovabook_private.business_address_required($1) value',[owner.owner_id])).rows[0].value,true);
  await q("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(q('select jovabook_private.billing_original_save_setup($1,$2,$3)',['','+447700900123',{}]),/not signed in/);
  const permissions=(await q("select has_function_privilege('authenticated','jovabook_private.business_address_required(uuid)','execute') helper,has_function_privilege('anon','public.owner_account_access()','execute') anon,has_function_privilege('authenticated','public.owner_account_access()','execute') owner")).rows[0];assert.deepEqual(permissions,{helper:false,anon:false,owner:true});
 }finally{await db.close();}
});
