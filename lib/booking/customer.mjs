import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db,rows,identity,cookiesFor,throttle} from './server.mjs';
import {settingsTable,scope,ownership,salonFields} from './store.mjs';
const json=(v,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
const sessionResponse=session=>{const r=json({ok:true});for(const cookie of cookiesFor(session))r.headers.append('Set-Cookie',cookie);return r;};
export async function customerRoute(route,req,body,salon){
 if(!route.startsWith('customer/'))return null;
 const c=db();const ip=req.headers.get('x-forwarded-for')||'local';
 if(route==='customer/signup'){
  throttle('signup:'+ip,5);
  const v=z.object({name:z.string().trim().min(1).max(150),phone:z.string().trim().max(40),email:z.string().trim().email().max(254),password:z.string().min(10).max(128)}).parse(body);
  const origin=req.headers.get('origin');if(!origin)return json({error:'Open the signup form on the website.'},400);
  const {data,error}=await c.auth.signUp({email:v.email,password:v.password,options:{data:{name:v.name,phone:v.phone},emailRedirectTo:origin+'/preview/booking/?customer=1'}});
  if(error){console.error('Signup provider error',error.code);return json({error:error.code==='over_email_send_rate_limit'?'Email limit reached. Please try again later.':'Account creation could not be completed. If you already have an account, sign in or reset your password.'},400);}
  if(data.session&&data.user?.email_confirmed_at)return sessionResponse(data.session);
  return json({pending:true,message:'Check your email to confirm your account, then sign in. If you already have an account, use Sign in.'});
 }
 if(route==='customer/confirm'){
  throttle('confirm:'+ip,20);
  const {refresh_token}=z.object({refresh_token:z.string().min(10).max(4096)}).parse(body);
  const {data,error}=await c.auth.refreshSession({refresh_token});
  if(error||!data.user?.email_confirmed_at)return json({error:'This email link is invalid or has expired. Request a new one.'},401);
  return sessionResponse(data.session);
 }
 if(route==='customer/recover'){
  throttle('recover:'+ip,5);const email=z.string().email().max(254).parse(body.email);
  const origin=req.headers.get('origin');if(!origin)return json({error:'Open the reset form on the website.'},400);
  await c.auth.resetPasswordForEmail(email,{redirectTo:origin+'/preview/booking/?customer=1&reset=1'});
  return json({message:'If an account exists, a password reset link will be sent. Check your inbox.'});
 }
 const who=await identity(req,salon);if(!who?.user.email_confirmed_at)return json({error:'Please sign in with a verified account.'},401);
 if(route==='customer/password'){
  const password=z.string().min(10).max(128).parse(body.password);
  // Validate the caller's access token again through the authenticated Auth API.
  const access=req.cookies.get('booking_access')?.value;const result=await c.auth.setSession({access_token:access,refresh_token:req.cookies.get('booking_refresh')?.value||''});
  if(result.error)return json({error:'Your session expired. Request a new reset link.'},401);
  const changed=await c.auth.updateUser({password});if(changed.error)return json({error:'Unable to update your password. Please request another link.'},400);
  return sessionResponse(result.data.session);
 }
 const clients=await rows(scope(c.from('clients').select('id').eq('user_id',who.user.id),salon));
 if(route==='customer/me'){
  const ids=clients.map(v=>v.id);const bookings=ids.length?await rows(scope(c.from('bookings').select('id,client_id,staff_id,service_id,starts_at,ends_at,status,price_pence').in('client_id',ids),salon).order('starts_at',{ascending:false})):[];
  const [studio,services,staff]=await Promise.all([rows(c.from(settingsTable(salon)).select('id,name,timezone,currency,phone,cancellation_notice_hours').eq('id',salon.id).single()),rows(scope(c.from('services').select('id,name,active'),salon)),rows(scope(c.from('staff').select('id,name'),salon))]);
  return json({name:who.user.user_metadata?.name||'',phone:who.user.user_metadata?.phone||'',email:who.user.email,bookings,salon:salonFields(studio,salon),services,staff});
 }
 if(route==='customer/cancel'){
  const bookingId=z.coerce.number().int().positive().parse(body.id);const ids=clients.map(v=>v.id);if(!ids.length)return json({error:'Appointment not found.'},404);
  const matches=await rows(c.from('bookings').select('*').eq('id',bookingId).in('client_id',ids));const booking=matches[0];if(!booking)return json({error:'Appointment not found.'},404);
  if(booking.status==='cancelled')return json({ok:true});
  const business=await rows(c.from(settingsTable(salon)).select('cancellation_notice_hours').eq('id',salon.id).single());
  if(booking.status!=='confirmed'||Date.parse(booking.starts_at)-Date.now()<business.cancellation_notice_hours*3600000)return json({error:'Online cancellation is closed. Please contact the studio.'},409);
  const changed=await rows(c.from('bookings').update({status:'cancelled'}).eq('id',booking.id).in('client_id',ids).eq('status','confirmed').gte('starts_at',new Date(Date.now()+business.cancellation_notice_hours*3600000).toISOString()).select('id'));
  if(!changed.length)return json({error:'This appointment changed. Refresh and try again, or contact the studio.'},409);return json({ok:true});
 }
 return json({error:'Not found.'},404);
}

export async function accountClient(c,user,salon,person){
 let found=await rows(scope(c.from('clients').select('id').eq('user_id',user.id),salon));if(found.length)return found[0].id;
 const inserted=await c.from('clients').insert({...ownership(salon),user_id:user.id,name:person.name,email:user.email,phone:person.phone}).select('id').single();
 if(inserted.error?.code==='23505'){found=await rows(scope(c.from('clients').select('id').eq('user_id',user.id),salon));if(found.length)return found[0].id;}
 if(inserted.error)throw inserted.error;return inserted.data.id;
}
