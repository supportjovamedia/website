import {timingSafeEqual} from 'node:crypto';
const PROVIDER='https://api.thesmsworks.co.uk/v1';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);};
const canonicalId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value)?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):null;
export function smsDeliveryState(status){return status==='DELIVERED'?'Delivered':['UNDELIVERABLE','UNDELIVERED','EXPIRED','REJECTED','DELETED'].includes(status)?'Failed':['SENT','SCHEDULED','PENDING','SUBMITTED'].includes(status)?'Sent':null;}
export function createSmsWorksAdapter({jwt,send=fetch,timeoutMs=10000}={}){
 async function request(path,method,body){try{const r=await send(PROVIDER+path,{method,headers:{'Content-Type':'application/json',Authorization:jwt},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs)});let data;try{data=await r.json();}catch{data=null;}return {status:r.status,data};}catch{return {status:0,data:null};}}
 return {
  async balance(){if(!jwt)return null;const r=await request('/credits/balance','GET');const credits=Number(r.data?.credits);return r.status===200&&r.data?.credits!=null&&Number.isFinite(credits)&&credits>=0?credits:null;},
  async sendMessage(payload){
   if(!jwt||typeof payload?.content!=='string'||!payload.content||payload.content.length>1280||!/^447\d{9}$/.test(payload.destination||'')||!/^[A-Za-z0-9]{3,11}$/.test(payload.sender||''))return {state:'Failed',reason:'Invalid server SMS configuration.'};
   const result=await request('/message/send','POST',{sender:payload.sender,destination:payload.destination,content:payload.content,tag:payload.tag,ai:false,validity:30});
   const messageId=canonicalId(result.data?.messageid);
   if(result.status===201&&messageId){const state=smsDeliveryState(result.data.status);return {state:state||'Sent',provider_id:messageId,provider_status:result.data.status||'SENT'};}
   // No provider idempotency guarantee is documented. Timeouts and 5xx may have sent.
   if(result.status>=400&&result.status<500)return {state:'Failed',reason:'Provider rejected the SMS request.'};
   return {state:'Unknown',reason:'Provider acceptance is unknown. Do not resend automatically.'};
  },
  async delivery(messageId,destination){
   if(!jwt||!canonicalId(messageId))return null;const result=await request('/messages/'+encodeURIComponent(messageId),'GET');
   if(result.status!==200||canonicalId(result.data?.messageid)!==String(messageId)||String(result.data?.destination)!==destination)return null;
   const state=smsDeliveryState(result.data.status);return state?{state,provider_id:messageId,provider_status:result.data.status}:null;
  }
 };
}
const PURESMS='https://connect-api.divergent.cloud/sms/send';
// PureSMS: UK 2.8p flat, US ~1.05p. It documents no balance or status-lookup endpoint, so balance() is unknown and
// accepted messages stay "Sent". A non-2xx 4xx is a definite rejection; timeouts and 5xx may have sent, so they are Unknown.
export function createPureSmsAdapter({apiKey,ukSender,usSender,send=fetch,timeoutMs=10000}={}){
 return {
  async balance(){return null;},
  async sendMessage(payload){
   const uk=/^447\d{9}$/.test(payload?.destination||''),us=/^1[2-9]\d{2}[2-9]\d{6}$/.test(payload?.destination||'');
   const sender=uk?payload.sender:us?usSender:null;
   if(!apiKey||typeof payload?.content!=='string'||!payload.content||payload.content.length>1280||!(uk||us)||!sender||!/^(\+?\d{6,15}|[A-Za-z0-9]{3,11})$/.test(sender))return {state:'Failed',reason:'Invalid server SMS configuration.'};
   let r;try{r=await send(PURESMS,{method:'POST',headers:{'Content-Type':'application/json','X-Api-Key':apiKey},body:JSON.stringify({sender,recipient:payload.destination,content:payload.content}),signal:AbortSignal.timeout(timeoutMs)});}
   catch{return {state:'Unknown',reason:'Provider acceptance is unknown. Do not resend automatically.'};}
   if(r.status>=200&&r.status<300){let data=null;try{data=await r.json();}catch{}const id=canonicalId(data?.id??data?.message_id??data?.messageId);return {state:'Sent',provider_id:id||'puresms-'+Date.now(),provider_status:'SENT'};}
   if(r.status>=400&&r.status<500)return {state:'Failed',reason:'Provider rejected the SMS request.'};
   return {state:'Unknown',reason:'Provider acceptance is unknown. Do not resend automatically.'};
  },
  async delivery(){return null;}
 };
}
const defaultAdapter=(env,send)=>env.PURESMS_API_KEY?createPureSmsAdapter({apiKey:env.PURESMS_API_KEY,ukSender:env.PURESMS_UK_SENDER,usSender:env.PURESMS_US_SENDER,send}):createSmsWorksAdapter({jwt:env.SMS_WORKS_JWT,send});
export function createOperatorSmsHandler({env=process.env,send=fetch,adapter}={}){
 const provider=adapter||defaultAdapter(env,send);
 return async request=>{
  if(request.method!=='POST')return reply(405,{ok:false});
  const origin=request.headers.get('origin');
  if(origin&&!['https://book.jovamedia.com','https://www.jovamedia.com'].includes(origin))return reply(403,{ok:false});
  const auth=request.headers.get('authorization');if(!/^Bearer [^\s]+$/.test(auth||''))return reply(401,{ok:false});
  try{
   const url=new URL('/rest/v1/rpc/operator_sms_overview',env.JOVABOOK_SUPABASE_URL);
   if(url.protocol!=='https:'||!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY)throw Error('Missing configuration');
   // The database checks the verified operator identity before any provider read.
   const response=await send(url.href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,Authorization:auth,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return reply([401,403].includes(response.status)?response.status:503,{ok:false});
   const data=await response.json();if(data?.ok!==true||!Array.isArray(data.businesses))throw Error('Invalid SMS overview');
   const credits=await provider.balance();
   return reply(200,{...data,credits,provider_ready:credits!==null,checked_at:new Date().toISOString()});
  }catch{return reply(503,{ok:false,message:'SMS activity could not be checked. Please try again.'});}
 };
}
export function createBookingSmsHandlers({env=process.env,send=fetch,adapter}={}){
 const provider=adapter||defaultAdapter(env,send);
 async function db(action,payload={}){const url=new URL('/rest/v1/rpc/booking_sms_worker',env.JOVABOOK_SUPABASE_URL);if(url.protocol!=='https:')throw Error('Invalid database origin');const r=await send(url.href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:env.JOVABOOK_SMS_WORKER_TOKEN,p_action:action,p_payload:payload}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('SMS database operation failed');return r.json();}
 return {async worker(request){
  if(request.method!=='POST')return reply(405,{ok:false});
  if(!/^[0-9a-f]{64}$/.test(env.JOVABOOK_SMS_WORKER_TOKEN||'')||!equal(request.headers.get('authorization'),'Bearer '+env.JOVABOOK_SMS_WORKER_TOKEN))return reply(401,{ok:false});
  const input=await request.json().catch(()=>({}));
  const configured=!!((env.PURESMS_API_KEY||env.SMS_WORKS_JWT)&&env.JOVABOOK_SUPABASE_URL&&env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY);
  // This protected action checks only database readiness and the provider's credit balance.
  // It cannot claim, prepare or send reminders, including while sending is switched off.
  if(input.action==='status'){if(!configured)return reply(503,{ok:false,attempted:0,message:'SMS server configuration is incomplete.'});try{const health=await db('health'),credits=await provider.balance();return reply(200,{ok:true,...health,dispatch_enabled:env.JOVABOOK_SMS_ENABLED==='true'&&health.enabled===true,provider_ready:credits!==null,credits,attempted:0});}catch{return reply(503,{ok:false,attempted:0,message:'SMS readiness could not be verified.'});}}
  if(env.JOVABOOK_SMS_ENABLED!=='true')return reply(200,{ok:true,enabled:false,attempted:0});
  if(!configured)return reply(503,{ok:false,message:'SMS server configuration is incomplete.'});
  let attempted=0,unknown=0;try{
   const health=await db('health');if(!health?.enabled||!health.provider_configured||!health.budgets_configured)return reply(200,{ok:true,enabled:false,attempted:0});
   const jobs=await db('claim');if(!Array.isArray(jobs))throw Error('Invalid SMS queue response');
   for(const job of jobs.slice(0,5)){
    if(!job?.id||!job.lease)continue;
    if(!await db('prepare',{id:job.id,lease:job.lease}))continue;
    const payload=await db('begin',{id:job.id,lease:job.lease});if(!payload)continue;
    attempted++;const result=await provider.sendMessage(payload);if(result.state==='Unknown')unknown++;
    // If finish fails, Sending expires into Unknown. It never returns to the send queue.
    await db('finish',{id:job.id,lease:job.lease,...result});
   }
   const polls=await db('poll');if(Array.isArray(polls))for(const job of polls.slice(0,5)){const result=await provider.delivery(job.provider_id,job.destination);if(result)await db('report',{id:job.id,...result});}
   return reply(200,{ok:true,enabled:true,attempted,unknown});
  }catch{return reply(503,{ok:false,attempted,unknown,message:'SMS processing stopped safely. Check server delivery state before retrying.'});}
 }};
}
