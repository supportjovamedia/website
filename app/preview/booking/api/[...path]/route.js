import {NextResponse} from 'next/server';
import {z} from 'zod';import {DateTime} from 'luxon';
import {db,rows,identity,cookiesFor,publicBusiness,throttle,sameOrigin,credentials} from '../../../../../lib/booking/server.mjs';
import {deploymentBusiness,bookingPolicy,websiteUrl} from '../../../../../lib/booking/business.mjs';
import {signReceipt,readReceipt} from '../../../../../lib/booking/receipt.mjs';
import {slotsFor} from '../../../../../lib/booking/availability.mjs';
import {customerRoute,accountClient} from '../../../../../lib/booking/customer.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const id=z.coerce.number().int().positive();
const contact=z.object({name:z.string().trim().min(1).max(150),email:z.string().trim().email().max(254).or(z.literal('')),phone:z.string().trim().max(40)}).refine(v=>v.email||v.phone.length>=6,'Provide an email or phone number');
function json(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function handle(req,context){try{
 const {path}=await context.params;const route=path.join('/');const q=new URL(req.url).searchParams;const c=db();const method=req.method;const body=method==='GET'?{}:await req.json();if(method!=='GET')sameOrigin(req);
 const deployment=await deploymentBusiness(c);
 const customer=await customerRoute(route,req,body,deployment.id);if(customer)return customer;
 if(route==='auth/login'){
  throttle('login:'+ (req.headers.get('x-forwarded-for')||'local'),10);const {username,password}=z.object({username:z.string().trim().min(1).max(254),password:z.string().min(1).max(128)}).parse(body);
  let email=username;if(!username.includes('@')){const members=await rows(c.from('business_members').select('user_id').eq('username',username.toLowerCase()).limit(1));if(!members.length)return json({error:'Incorrect username or password.'},401);const result=await c.auth.admin.getUserById(members[0].user_id);email=result.data.user?.email||'';}
  const result=await c.auth.signInWithPassword({email,password});if(result.error)return json({error:'Incorrect username or password.'},401);
  const response=json({ok:true});for(const cookie of cookiesFor(result.data.session))response.headers.append('Set-Cookie',cookie);return response;
 }
 if(route==='auth/logout'){const token=req.cookies.get('booking_access')?.value;if(token)await c.auth.admin.signOut(token);const r=json({ok:true});r.cookies.set('booking_access','',{maxAge:0,path:'/preview/booking'});r.cookies.set('booking_refresh','',{maxAge:0,path:'/preview/booking'});return r;}
 if(route==='auth/refresh'){const refresh=req.cookies.get('booking_refresh')?.value;if(!refresh)return json({error:'Please sign in.'},401);const {data,error}=await c.auth.refreshSession({refresh_token:refresh});if(error)return json({error:'Please sign in.'},401);const r=json({ok:true});for(const cookie of cookiesFor(data.session))r.headers.append('Set-Cookie',cookie);return r;}
 if(route==='public/businesses')return json(await rows(c.from('businesses').select(publicBusiness).eq('active',true).eq('id',deployment.id).order('name')));
 if(route==='public/catalog'){
  if(q.get('slug')&&q.get('slug')!==deployment.slug)return json({error:'Studio not found.'},404);
  const business=await rows(c.from('businesses').select(publicBusiness).eq('slug',deployment.slug).eq('active',true).single());
  const [services,staff,links]=await Promise.all([rows(c.from('services').select('*').eq('business_id',business.id).eq('active',true).order('id')),rows(c.from('staff').select('id,name').eq('business_id',business.id).eq('active',true).order('id')),rows(c.from('staff_services').select('*').eq('business_id',business.id))]);return json({business,services,staff,links,payment:bookingPolicy()});
 }
 if(route==='public/slots'){
  const businessId=id.parse(q.get('business'));if(businessId!==deployment.id)return json({error:'Studio not found.'},404);const serviceId=id.parse(q.get('service'));const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(q.get('date'));
  const business=await rows(c.from('businesses').select(publicBusiness).eq('id',businessId).eq('active',true).single());
  const service=await rows(c.from('services').select('*').eq('id',serviceId).eq('business_id',businessId).eq('active',true).single());
  const [people,links,hours,bookings,timeOff]=await Promise.all([rows(c.from('staff').select('id,name').eq('business_id',businessId).eq('active',true)),rows(c.from('staff_services').select('staff_id').eq('business_id',businessId).eq('service_id',serviceId)),rows(c.from('working_hours').select('*').eq('business_id',businessId)),rows(c.from('bookings').select('staff_id,starts_at,reserved_until,status').eq('business_id',businessId).gte('starts_at',DateTime.fromISO(date,{zone:business.timezone}).startOf('day').toUTC().toISO()).lt('starts_at',DateTime.fromISO(date,{zone:business.timezone}).plus({days:1}).startOf('day').toUTC().toISO())),rows(c.from('time_off').select('staff_id,starts_at,ends_at').eq('business_id',businessId))]);
  const staff=people.filter(p=>links.some(l=>l.staff_id===p.id)&&(!q.get('staff')||p.id===Number(q.get('staff'))));return json(slotsFor({business,service,staff,hours,bookings,timeOff,date}));
 }
 if(route==='public/book'){
  throttle('book:'+(req.headers.get('x-forwarded-for')||'local'),30);
  const v=z.object({business_id:id,service_id:id,staff_id:id,starts_at:z.string().datetime({offset:true}),request_id:z.string().uuid(),website:z.string().max(0).optional()}).passthrough().parse(body);
  const splitName=body.first_name!==undefined||body.last_name!==undefined?z.object({first_name:z.string().trim().min(1).max(75),last_name:z.string().trim().min(1).max(74)}).parse(body):null;
  const person=contact.parse({...body,...(splitName?{name:splitName.first_name+' '+splitName.last_name}:{}),phone:body.phone||''});
  if(v.business_id!==deployment.id)return json({error:'Studio not found.'},404);
  const account=await identity(req);if(body.use_account&&!account?.user.email_confirmed_at)return json({error:'Please sign in again before booking with your account.'},401);const clientId=!body.guest&&account?.user.email_confirmed_at?await accountClient(c,account.user,v.business_id,person):null;if(clientId)person.email=account.user.email;
  const b=await rows(c.rpc('create_booking',{p_client:clientId,p_business:v.business_id,p_staff:v.staff_id,p_service:v.service_id,p_start:v.starts_at,p_name:person.name,p_email:person.email,p_phone:person.phone,p_request:v.request_id}));
  const response=json({id:b.id,starts_at:b.starts_at,ends_at:b.ends_at,price_pence:b.price_pence,status:b.status},201);
  response.cookies.set('booking_receipt',signReceipt(b.id,deployment.id,credentials().key),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/preview/booking',maxAge:86400});return response;
 }
 if(route==='public/confirmation'){
  const receipt=readReceipt(req.cookies.get('booking_receipt')?.value,deployment.id,credentials().key);
  if(!receipt)return json({error:'Your confirmation has expired or is not available in this browser. Check your account or contact the studio with your booking reference.'},404);
  const booking=await rows(c.from('bookings').select('id,business_id,client_id,service_id,staff_id,starts_at,ends_at,price_pence,status').eq('id',receipt.bookingId).eq('business_id',deployment.id).single());
  const [business,service,staff,client,who]=await Promise.all([rows(c.from('businesses').select('name,address,currency,timezone').eq('id',deployment.id).single()),rows(c.from('services').select('name').eq('id',booking.service_id).eq('business_id',deployment.id).single()),rows(c.from('staff').select('name').eq('id',booking.staff_id).eq('business_id',deployment.id).single()),rows(c.from('clients').select('user_id').eq('id',booking.client_id).eq('business_id',deployment.id).single()),identity(req)]);
  return json({booking,business,service_name:service.name,staff_name:staff.name,account_booking:!!who&&client.user_id===who.user.id,payment:bookingPolicy(),website_url:websiteUrl()});
 }
 const who=await identity(req);if(!who)return json({error:'Please sign in.'},401);
 if(route==='me'){const members=who.members.filter(m=>m.business_id===deployment.id);const ids=members.map(m=>m.business_id);return json({email:who.user.email,businesses:ids.length?await rows(c.from('businesses').select('*').in('id',ids)):[],members});}
 const businessId=id.parse(body.business_id||q.get('business'));const membership=who.members.find(m=>m.business_id===businessId&&businessId===deployment.id);if(!membership)return json({error:'Access denied.'},403);
 if(method!=='GET'&&membership.role!=='owner')return json({error:'Owner access required.'},403);
 if(route==='dashboard'){
  const [business,services,staff,links,hours,timeOff,clients,bookings]=await Promise.all([rows(c.from('businesses').select('*').eq('id',businessId).single()),rows(c.from('services').select('*').eq('business_id',businessId).order('id')),rows(c.from('staff').select('*').eq('business_id',businessId).order('id')),rows(c.from('staff_services').select('*').eq('business_id',businessId)),rows(c.from('working_hours').select('*').eq('business_id',businessId)),rows(c.from('time_off').select('*').eq('business_id',businessId)),rows(c.from('clients').select('*').eq('business_id',businessId).order('name')),rows(c.from('bookings').select('*').eq('business_id',businessId).order('starts_at'))]);return json({business,services,staff,links,hours,timeOff,clients,bookings,role:membership.role});
 }
 if(route==='settings'){const values=z.object({name:z.string().trim().min(1).max(150),description:z.string().max(1000),address:z.string().max(300),phone:z.string().max(40),email:z.string().email(),timezone:z.enum(['Europe/London','Europe/Paris','America/New_York','Asia/Dubai']),minimum_notice_minutes:z.coerce.number().int().min(0).max(10080),booking_window_days:z.coerce.number().int().min(1).max(365),cancellation_notice_hours:z.coerce.number().int().min(0).max(168)}).parse(body);return json(await rows(c.from('businesses').update(values).eq('id',businessId).select().single()));}
 if(route==='services'){const values=z.object({name:z.string().trim().min(1).max(150),price_pence:z.coerce.number().int().min(0).max(1000000),duration_minutes:z.coerce.number().int().min(5).max(480),buffer_minutes:z.coerce.number().int().min(0).max(120),active:z.boolean().default(true)}).parse(body);return json(await rows(body.id?c.from('services').update(values).eq('business_id',businessId).eq('id',id.parse(body.id)).select().single():c.from('services').insert({...values,business_id:businessId}).select().single()));}
 if(route==='staff'){const values=z.object({name:z.string().trim().min(1).max(150),active:z.boolean().default(true)}).parse(body);return json(await rows(body.id?c.from('staff').update(values).eq('business_id',businessId).eq('id',id.parse(body.id)).select().single():c.from('staff').insert({...values,business_id:businessId}).select().single()));}
 if(route==='staff-service'){const staffId=id.parse(body.staff_id),serviceId=id.parse(body.service_id);if(body.enabled)return json(await rows(c.from('staff_services').upsert({business_id:businessId,staff_id:staffId,service_id:serviceId}).select()));return json(await rows(c.from('staff_services').delete().eq('business_id',businessId).eq('staff_id',staffId).eq('service_id',serviceId)));}
 if(route==='hours'){const values=z.object({staff_id:id,weekday:z.coerce.number().int().min(0).max(6),opens_at:z.string().regex(/^\d{2}:\d{2}$/),closes_at:z.string().regex(/^\d{2}:\d{2}$/)}).parse(body);if(body.remove)return json(await rows(c.from('working_hours').delete().eq('business_id',businessId).eq('id',id.parse(body.id))));return json(await rows(body.id?c.from('working_hours').update(values).eq('business_id',businessId).eq('id',id.parse(body.id)).select().single():c.from('working_hours').insert({...values,business_id:businessId}).select().single()));}
 if(route==='time-off'){if(body.remove)return json(await rows(c.from('time_off').delete().eq('business_id',businessId).eq('id',id.parse(body.id))));const values=z.object({staff_id:id,starts_at:z.string().datetime({offset:true}),ends_at:z.string().datetime({offset:true}),reason:z.string().max(200)}).parse(body);return json(await rows(c.from('time_off').insert({...values,business_id:businessId}).select().single()));}
 if(route==='clients'){const values={...contact.parse(body),notes:z.string().max(2000).parse(body.notes||'')};return json(await rows(body.id?c.from('clients').update(values).eq('business_id',businessId).eq('id',id.parse(body.id)).select().single():c.from('clients').insert({...values,business_id:businessId}).select().single()));}
 if(route==='booking'){
  if(body.id){const values=z.object({status:z.enum(['confirmed','cancelled','completed','no_show']).optional(),starts_at:z.string().datetime({offset:true}).optional(),staff_id:id.optional()}).parse(body);return json(await rows(c.from('bookings').update(values).eq('business_id',businessId).eq('id',id.parse(body.id)).select().single()));}
  const person=contact.parse(body);return json(await rows(c.rpc('create_booking',{p_business:businessId,p_staff:id.parse(body.staff_id),p_service:id.parse(body.service_id),p_start:z.string().datetime({offset:true}).parse(body.starts_at),p_name:person.name,p_email:person.email,p_phone:person.phone,p_request:z.string().uuid().parse(body.request_id),p_client:body.client_id?id.parse(body.client_id):null})),201);
 }
 return json({error:'Not found'},404);
}catch(e){if(e.message==='SETUP_REQUIRED')return json({error:'Database connection needs setup.'},503);if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check your details.'},400);if(e.code==='23P01')return json({error:'This time was just taken. Choose another time.'},409);if(e.code==='P0001')return json({error:e.message},409);if(e.code==='23503')return json({error:'The selected client, staff or service does not belong to this business.'},400);console.error('API error',e.code||e.name,e.message);return json({error:e.status?e.message:'Unable to complete the request. Please try again.'},e.status||500);}}
export const GET=handle;export const POST=handle;
