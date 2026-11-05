/* Team logins for Pro Team. The owner creates, changes and removes a login for each team member.
   The caller must be the signed-in owner of an active Pro Team business. Accounts are created with the
   Supabase admin API (server only), then linked to the business and staff member in the database. */
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const fail=(status,message)=>Object.assign(Error(message),{status});
const EMAIL=/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]{2,}$/;
const ACTIONS=['create','password','email','remove'];
export const passwordProblem=value=>{
 const p=String(value??'');
 if(p.length<8)return 'Use at least 8 characters.';
 if(p.length>72)return 'Use 72 characters or fewer.';
 if(!/[A-Z]/.test(p))return 'Include a capital letter.';
 if(!/[0-9]/.test(p))return 'Include a number.';
 return '';
};
async function rawBody(request,max=4096){const reader=request.body?.getReader();if(!reader)return '';const chunks=[];let n=0;for(;;){const x=await reader.read();if(x.done)break;n+=x.value.length;if(n>max){await reader.cancel();throw fail(413,'Request too large.');}chunks.push(x.value);}return Buffer.concat(chunks).toString('utf8');}

export function createJovaBookTeamHandlers({env=process.env,send=fetch}={}){
 const base=()=>{const url=new URL(env.JOVABOOK_SUPABASE_URL||'');if(url.protocol!=='https:')throw Error('Invalid account server.');return url;};
 const configured=()=>{try{base();}catch{return false;}return !!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY&&!!env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY&&/^[0-9a-f]{64}$/.test(env.JOVABOOK_BILLING_WORKER_TOKEN||'');};
 async function call(path,{method='POST',body,token,admin=false}={}){
  const key=admin?env.JOVABOOK_SUPABASE_SERVICE_ROLE_KEY:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY;
  const r=await send(new URL(path,base()).href,{method,headers:{apikey:key,'Content-Type':'application/json',Authorization:'Bearer '+(admin?key:token||key)},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  let data;try{data=await r.json();}catch{}
  return {ok:r.ok,status:r.status,data};
 }
 const worker=async(action,payload)=>{
  const r=await call('/rest/v1/rpc/booking_team_worker',{body:{p_token:env.JOVABOOK_BILLING_WORKER_TOKEN,p_action:action,p_payload:payload}});
  if(!r.ok)throw fail(503,'Team logins could not be updated. Try again.');
  return r.data;
 };
 async function owner(request,salon){
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)throw fail(401,'Log in to manage your team.');
  const user=await call('/auth/v1/user',{method:'GET',token});
  if(!user.ok||!uuid(user.data?.id))throw fail(401,'Your account could not be verified.');
  const access=await call('/rest/v1/rpc/owner_account_access',{body:{},token});
  const a=access.data;
  if(!access.ok||a?.team===true||a?.access!=='active'||!uuid(a?.business?.id))throw fail(403,'Only the business owner can manage team logins.');
  if(a.business.id!==salon)throw fail(403,'Your business changed. Refresh and try again.');
  if(a.business.plan!=='premium')throw fail(403,'Team logins are part of the Pro Team plan.');
  return {user:user.data,salon:a.business.id};
 }
 async function readInput(request){
  if(request.method!=='POST')throw fail(405,'POST only.');
  let b;try{b=JSON.parse(await rawBody(request)||'{}');}catch(e){throw e.status?e:fail(400,'Invalid request.');}
  if(!b||typeof b!=='object'||Array.isArray(b))throw fail(400,'Invalid request.');
  const allowed=['action','salon_id','staff_id','email','password'];
  if(Object.keys(b).some(k=>!allowed.includes(k)))throw fail(400,'Invalid request.');
  if(!ACTIONS.includes(b.action))throw fail(400,'Choose what to do.');
  if(!uuid(b.salon_id))throw fail(400,'Your business could not be identified.');
  if(typeof b.staff_id!=='string'||b.staff_id.length<1||b.staff_id.length>64)throw fail(400,'Choose a team member.');
  if(b.email!==undefined){
   const email=String(b.email).trim().toLowerCase();
   if(!EMAIL.test(email)||email.length>254)throw fail(400,'Enter a valid email address.');
   b.email=email;
  }
  if(['create','email'].includes(b.action)&&!b.email)throw fail(400,'Enter an email address.');
  if(['create','password'].includes(b.action)){
   const problem=passwordProblem(b.password);
   if(problem)throw fail(400,problem);
  }
  return b;
 }
 const adminError=(r,fallback)=>{
  const text=JSON.stringify(r.data||{}).toLowerCase();
  if(r.status===422||/already|registered|exists/.test(text))return fail(409,'That email already has a JovaBook account. Use a different email for this team member.');
  if(r.status===400&&/password/.test(text))return fail(400,'That password was not accepted. Try a longer one.');
  return fail(503,fallback);
 };
 async function manage(request){
  try{
   if(!configured())throw fail(503,'Team logins are not connected yet.');
   const b=await readInput(request);
   const {salon}=await owner(request,b.salon_id);
   const ctx=await worker('context',{salon,staff_id:b.staff_id});
   if(ctx?.ok!==true)throw fail(404,ctx?.message||'Save this team member before giving them a login.');
   if(b.action==='create'){
    if(ctx.has_login)throw fail(409,'This team member already has a login.');
    if(ctx.active!==true)throw fail(409,'Switch this team member on before giving them a login.');
    const made=await call('/auth/v1/admin/users',{admin:true,body:{email:b.email,password:b.password,email_confirm:true,user_metadata:{jovabook_team_member:true}}});
    const id=made.data?.id;
    if(!made.ok||!uuid(id))throw adminError(made,'The login could not be created. Try again.');
    let linked;
    try{linked=await worker('link',{salon,staff_id:b.staff_id,user:id,email:b.email});}catch(e){linked=null;}
    if(linked?.ok!==true){
     await call('/auth/v1/admin/users/'+id,{method:'DELETE',admin:true}).catch(()=>{});
     throw fail(linked?409:503,linked?.message||'The login could not be linked to your business. Try again.');
    }
    return reply(200,{ok:true,staff_id:b.staff_id,email:b.email});
   }
   if(!ctx.has_login||!uuid(ctx.user_id))throw fail(404,'This team member has no login yet.');
   if(b.action==='password'){
    const r=await call('/auth/v1/admin/users/'+ctx.user_id,{method:'PUT',admin:true,body:{password:b.password}});
    if(!r.ok)throw adminError(r,'The password could not be changed. Try again.');
    return reply(200,{ok:true,staff_id:b.staff_id,email:ctx.email});
   }
   if(b.action==='email'){
    const r=await call('/auth/v1/admin/users/'+ctx.user_id,{method:'PUT',admin:true,body:{email:b.email,email_confirm:true}});
    if(!r.ok)throw adminError(r,'The email could not be changed. Try again.');
    const linked=await worker('email',{salon,staff_id:b.staff_id,email:b.email});
    if(linked?.ok!==true)throw fail(503,'The email could not be changed. Try again.');
    return reply(200,{ok:true,staff_id:b.staff_id,email:b.email});
   }
   const removed=await worker('unlink',{salon,staff_id:b.staff_id});
   if(removed?.ok!==true)throw fail(503,'The login could not be removed. Try again.');
   if(uuid(removed.user_id))await call('/auth/v1/admin/users/'+removed.user_id,{method:'DELETE',admin:true}).catch(()=>{});
   return reply(200,{ok:true,staff_id:b.staff_id,removed:true});
  }catch(e){
   return reply(e.status||503,{ok:false,message:e.status&&e.status<500?e.message:'Team logins could not be updated. Try again.'});
  }
 }
 return {manage};
}
