import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
test('service descriptions retain tenant/public-data boundaries and existing booking notes',async()=>{
 const db=new PGlite();try{await bootstrap(db,await sources());const q=(sql,args=[])=>db.query(sql,args),s=(await q('select salon_id,id from public.services order by salon_id,id limit 1')).rows[0];
 await q('update public.services set description=$1 where salon_id=$2 and id=$3',['Balloons, decorations and a personal message.',s.salon_id,s.id]);
 await assert.rejects(q('update public.services set description=$1 where salon_id=$2 and id=$3',['x'.repeat(1001),s.salon_id,s.id]),/check constraint/);
 const salon=(await q('select slug from public.salons where id=$1',[s.salon_id])).rows[0],data=(await q('select public.public_salon($1) value',[salon.slug])).rows[0].value;assert(data);assert.match(data.services.find(x=>x.id===s.id).description,/Balloons/);assert(data.busy.every(x=>!Object.hasOwn(x,'notes')&&!Object.hasOwn(x,'email')));
 const columns=(await q("select column_name from information_schema.columns where table_schema='public' and table_name='bookings'")).rows.map(x=>x.column_name);assert(columns.includes('notes'));assert(!columns.includes('special_instructions'));
 const grants=(await q("select has_function_privilege('anon','jovabook_private.public_salon_before_service_description(text)','execute') hidden,has_function_privilege('anon','public.public_salon(text)','execute') visible")).rows[0];assert.equal(grants.hidden,false);assert.equal(grants.visible,true);
 }finally{await db.close();}
});
