import test from 'node:test';
import assert from 'node:assert/strict';
import {createJovaBookTeamHandlers,passwordProblem} from '../lib/jovabook-team.mjs';
const SALON='20000000-0000-4000-8000-000000000001',OWNER='10000000-0000-4000-8000-000000000001',NEW_USER='30000000-0000-4000-8000-000000000001';
const env={JOVABOOK_SUPABASE_URL:'https://project.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'publishable',JOVABOOK_SUPABASE_SERVICE_ROLE_KEY:'service-role',JOVABOOK_BILLING_WORKER_TOKEN:'a'.repeat(64)};
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

function harness({access,context={ok:true,plan:'premium',active:true,has_login:false},link={ok:true},adminCreate,env:extra={}}={}){
 const calls=[];
 const send=async(url,init)=>{
  const u=new URL(url),body=init.body?JSON.parse(init.body):undefined,auth=init.headers.Authorization;
  calls.push({path:u.pathname,method:init.method,body,auth});
  if(u.pathname==='/auth/v1/user')return auth==='Bearer owner-token'||auth==='Bearer staff-token'?json(200,{id:OWNER}):json(401,{});
  if(u.pathname==='/rest/v1/rpc/owner_account_access'){
   if(auth==='Bearer staff-token')return json(200,{ok:false,access:'wrong_portal',role:'team'});
   return json(200,access??{ok:true,access:'active',business:{id:SALON,plan:'premium'}});
  }
  if(u.pathname==='/rest/v1/rpc/booking_team_worker'){
   assert.equal(body.p_token,env.JOVABOOK_BILLING_WORKER_TOKEN);
   if(body.p_action==='context')return json(200,context);
   if(body.p_action==='link')return json(200,link);
   if(body.p_action==='unlink')return json(200,{ok:true,removed:true,user_id:NEW_USER});
   if(body.p_action==='email')return json(200,{ok:true});
  }
  if(u.pathname==='/auth/v1/admin/users'&&init.method==='POST'){assert.equal(auth,'Bearer service-role');return adminCreate?adminCreate(body):json(200,{id:NEW_USER,email:body.email});}
  if(u.pathname.startsWith('/auth/v1/admin/users/')){assert.equal(auth,'Bearer service-role');return json(200,{});}
  throw Error('unexpected '+u.pathname);
 };
 const {manage}=createJovaBookTeamHandlers({env:{...env,...extra},send});
 const post=(body,token='owner-token')=>manage(new Request('https://x.test/api/jovabook/team',{method:'POST',headers:token?{authorization:'Bearer '+token}:{},body:JSON.stringify(body)}));
 return {post,calls};
}
const create={action:'create',salon_id:SALON,staff_id:'anna',email:'Anna@Example.test',password:'Sunshine1'};

test('password rules match the rest of JovaBook',()=>{
 assert.match(passwordProblem('short1A'),/8 characters/);
 assert.match(passwordProblem('alllowercase1'),/capital/);
 assert.match(passwordProblem('NoNumbersHere'),/number/);
 assert.equal(passwordProblem('Sunshine1'),'');
});

test('only the owner of an active Team business can manage logins',async()=>{
 let h=harness();
 assert.equal((await h.post(create,null)).status,401);
 assert.equal((await h.post(create,'stranger')).status,401);
 // A team member cannot create logins, even for their own business.
 h=harness();assert.equal((await h.post(create,'staff-token')).status,403);
 assert.equal(h.calls.some(c=>c.path==='/auth/v1/admin/users'),false);
 // Not on Team, billing paused or another business.
 h=harness({access:{ok:true,access:'active',business:{id:SALON,plan:'standard'}}});assert.equal((await h.post(create)).status,403);
 h=harness({access:{ok:true,access:'billing_only',business:{id:SALON,plan:'premium'}}});assert.equal((await h.post(create)).status,403);
 h=harness({access:{ok:true,access:'active',business:{id:'20000000-0000-4000-8000-000000000002',plan:'premium'}}});assert.equal((await h.post(create)).status,403);
 for(const h2 of [h])assert.equal(h2.calls.some(c=>c.path==='/auth/v1/admin/users'),false);
 // Not connected.
 h=harness({env:{JOVABOOK_SUPABASE_SERVICE_ROLE_KEY:''}});assert.equal((await h.post(create)).status,503);
});

test('requests are validated before anything is created',async()=>{
 const h=harness();
 for(const bad of [{...create,email:'nope'},{...create,password:'weak'},{...create,staff_id:''},{...create,salon_id:'x'},{...create,action:'delete-everything'},{...create,extra:1},{...create,email:undefined}]){
  const r=await h.post(bad);assert.equal(r.status,400);
 }
 assert.equal(h.calls.some(c=>c.path==='/auth/v1/admin/users'),false);
 assert.equal((await new Request('https://x.test/',{method:'GET'}).method),'GET');
});

test('creating a login makes a verified account and links it to the business',async()=>{
 const h=harness(),r=await h.post(create),data=await r.json();
 assert.equal(r.status,200);assert.equal(data.ok,true);assert.equal(data.email,'anna@example.test');
 const made=h.calls.find(c=>c.path==='/auth/v1/admin/users'&&c.method==='POST');
 assert.equal(made.body.email,'anna@example.test');assert.equal(made.body.email_confirm,true);assert.equal(made.body.password,'Sunshine1');
 const link=h.calls.find(c=>c.body?.p_action==='link');
 assert.deepEqual(link.body.p_payload,{salon:SALON,staff_id:'anna',user:NEW_USER,email:'anna@example.test'});
 assert.equal(JSON.stringify(data).includes('Sunshine1'),false);
});

test('creating a login cleans up and explains when something goes wrong',async()=>{
 // Already has a login, or the member is switched off.
 let h=harness({context:{ok:true,has_login:true,active:true}});assert.equal((await h.post(create)).status,409);
 h=harness({context:{ok:true,has_login:false,active:false}});assert.equal((await h.post(create)).status,409);
 h=harness({context:{ok:false,message:'Save this team member before giving them a login.'}});assert.equal((await h.post(create)).status,404);
 // The email already belongs to another account.
 h=harness({adminCreate:()=>json(422,{msg:'A user with this email address has already been registered'})});
 let r=await h.post(create);assert.equal(r.status,409);assert.match((await r.json()).message,/already has a JovaBook account/);
 assert.equal(h.calls.some(c=>c.body?.p_action==='link'),false);
 // Linking is refused after the account was made: the account is removed again.
 h=harness({link:{ok:false,message:'Team logins are part of the Team plan.'}});
 r=await h.post(create);assert.equal(r.status,409);
 assert.equal(h.calls.some(c=>c.path==='/auth/v1/admin/users/'+NEW_USER&&c.method==='DELETE'),true);
});

test('the owner can change a password or email, and remove a login',async()=>{
 const ctx={ok:true,has_login:true,active:true,user_id:NEW_USER,email:'anna@example.test'};
 let h=harness({context:ctx});
 let r=await h.post({action:'password',salon_id:SALON,staff_id:'anna',password:'Another2Pass'});assert.equal(r.status,200);
 assert.equal(h.calls.find(c=>c.method==='PUT').body.password,'Another2Pass');
 assert.equal((await h.post({action:'password',salon_id:SALON,staff_id:'anna',password:'weak'})).status,400);
 h=harness({context:ctx});
 r=await h.post({action:'email',salon_id:SALON,staff_id:'anna',email:'anna.new@example.test'});assert.equal(r.status,200);
 assert.equal(h.calls.find(c=>c.method==='PUT').body.email,'anna.new@example.test');
 assert.equal(h.calls.find(c=>c.body?.p_action==='email').body.p_payload.email,'anna.new@example.test');
 h=harness({context:ctx});
 r=await h.post({action:'remove',salon_id:SALON,staff_id:'anna'});assert.equal(r.status,200);assert.equal((await r.json()).removed,true);
 assert.equal(h.calls.some(c=>c.method==='DELETE'&&c.path==='/auth/v1/admin/users/'+NEW_USER),true);
 // Nothing to change when there is no login.
 h=harness();assert.equal((await h.post({action:'remove',salon_id:SALON,staff_id:'anna'})).status,404);
});
