import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {DateTime} from 'luxon';
import {createClient} from '@supabase/supabase-js';
const base=(process.env.TEST_URL||'http://127.0.0.1:3100')+'/preview/booking';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Disposable customer integration tests must run locally.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const c=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,options);
const users=[],bookings=[],clients=[];
async function request(path,body,cookie){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};}
async function register(i){
 const email=`customer-qa-${randomUUID()}@example.invalid`,password=randomBytes(18).toString('base64url')+'!9a';
 // Generate, but do not send, an email activation link for this disposable fixture.
 const generated=await c.auth.admin.generateLink({type:'signup',email,password,options:{data:{name:'Customer QA '+i,phone:'07700 900003'},redirectTo:base+'/?customer=1'}});assert(!generated.error,generated.error?.message);users.push(generated.data.user.id);
 const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,options);
 const confirmed=await auth.auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:'signup'});assert(!confirmed.error,confirmed.error?.message);
 const callback=await request('customer/confirm',{refresh_token:confirmed.data.session.refresh_token});assert.equal(callback.status,200);
 return {email,password,user:generated.data.user.id,cookie:callback.cookie,auth};
}
try{
 assert.equal((await request('customer/me')).status,401);
 assert.equal((await request('customer/signup',{name:'QA',phone:'',email:'invalid',password:'short'})).status,400);
 const a=await register(1),b=await register(2);
 a.cookie=(await request('auth/login',{username:a.email,password:a.password})).cookie;
 const cat=(await request('public/catalog')).data;const service=cat.services[0],person=cat.staff[0];
 assert.equal((await request('dashboard',null,a.cookie)).status,403);
 let day=DateTime.now().setZone('Europe/London').plus({days:5});if(day.weekday===7)day=day.plus({days:1});
 const slots=(await request(`public/slots?service=${service.id}&date=${day.toISODate()}&staff=${person.id}`)).data;assert(slots.length>5);
 async function book(slot,cookie,extra={}){const payload={service_id:service.id,staff_id:person.id,starts_at:slot.starts_at,request_id:randomUUID(),name:'Customer QA',email:a.email,phone:'07700 900003',...extra};const r=await request('public/book',payload,cookie);assert.equal(r.status,201,JSON.stringify(r.data));bookings.push(r.data.id);const confirmation=await request('public/confirmation',null,cookie+'; '+r.cookie);assert.equal(confirmation.status,200);assert.equal(confirmation.data.account_booking,!extra.guest);assert.equal(confirmation.data.booking.id,r.data.id);assert.equal(confirmation.data.payment.deposit_percent,25);assert.equal(confirmation.data.payment.online_payments_enabled,false);const saved=await c.from('bookings').select('client_id').eq('id',r.data.id).single();assert(!saved.error);clients.push(saved.data.client_id);return r.data;}
 const first=await book(slots[0],a.cookie);
 const conflict=await request('public/book',{service_id:service.id,staff_id:person.id,starts_at:slots[0].starts_at,request_id:randomUUID(),name:'Customer QA',email:a.email,phone:''},a.cookie);assert.equal(conflict.status,409,'double bookings must be rejected');
 const second=await book(slots[3],a.cookie);
 assert.equal(clients[0],clients[1],'repeat account bookings must reuse the same salon client');
 const guest=await book(slots[6],a.cookie,{guest:true});
 const mine=await request('customer/me',null,a.cookie);assert.deepEqual(mine.data.bookings.map(x=>x.id).sort(),[first.id,second.id].sort());assert(!mine.data.bookings.some(x=>x.id===guest.id));
 assert.equal((await request('customer/me',null,b.cookie)).data.bookings.length,0);
 assert.equal((await request('customer/cancel',{id:first.id},b.cookie)).status,404);
 const direct=await a.auth.from('clients').select('id');assert(!direct.error);assert.equal(direct.data.length,0,'customer must not bypass server access checks through the Data API');
 assert.equal((await request('customer/cancel',{id:first.id},a.cookie)).status,200);
 assert.equal((await request('customer/cancel',{id:first.id},a.cookie)).status,200);
 const next=(await request('customer/me',null,a.cookie)).data;assert.equal(next.bookings.find(x=>x.id===first.id).status,'cancelled');
 const recovery=await c.auth.admin.generateLink({type:'recovery',email:b.email,options:{redirectTo:base+'/?customer=1&reset=1'}});assert(!recovery.error,recovery.error?.message);
 const recovered=await b.auth.auth.verifyOtp({token_hash:recovery.data.properties.hashed_token,type:'recovery'});assert(!recovered.error,recovered.error?.message);
 const resetSession=await request('customer/confirm',{refresh_token:recovered.data.session.refresh_token});assert.equal(resetSession.status,200);
 const newPassword=randomBytes(18).toString('base64url')+'!9a';
 assert.equal((await request('customer/password',{password:newPassword},a.cookie)).status,400,'account password changes require current password');
 assert.equal((await request('customer/password',{password:newPassword,current_password:'incorrect-password'},a.cookie)).status,400,'wrong current password is rejected');
 assert.equal((await request('customer/password/reset',{password:newPassword,reset:true},a.cookie)).status,401,'a reset flag cannot turn a normal session into email recovery');
 const changed=await request('customer/password/reset',{password:newPassword},resetSession.cookie);assert.equal(changed.status,200,JSON.stringify(changed.data));
 const accountChange=await request('customer/password',{password:newPassword,current_password:a.password},a.cookie);assert.equal(accountChange.status,200,JSON.stringify(accountChange.data));
 assert.equal((await request('auth/login',{username:a.email,password:a.password})).status,401);
 assert.equal((await request('auth/login',{username:b.email,password:b.password})).status,401);
 assert.equal((await request('auth/login',{username:b.email,password:newPassword})).status,200);
 const login=await request('auth/login',{username:a.email,password:newPassword});assert.equal(login.status,200);
 assert.equal((await request('auth/logout',{},login.cookie)).status,200);
 assert.equal((await request('customer/me')).status,401);
 console.log('PASS current-password enforcement, wrong-password rejection, forged-recovery rejection, email recovery without old password, logout, customer email activation callback, sign-in, account bookings, repeat-client linking, guest exclusion, customer isolation, owner access denied, direct database access denied, cancel and password change. Email delivery is not simulated or claimed.');
}finally{
 if(bookings.length){const r=await c.from('bookings').delete().in('id',bookings);assert(!r.error,r.error?.message);}
 if(clients.length){const r=await c.from('clients').delete().in('id',[...new Set(clients)]);assert(!r.error,r.error?.message);}
 for(const user of users){const r=await c.auth.admin.deleteUser(user);assert(!r.error,r.error?.message);}
}
