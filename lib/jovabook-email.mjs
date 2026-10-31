import {createHmac,timingSafeEqual} from 'node:crypto';

const EVENTS=['email.delivered','email.bounced','email.complained','email.suppressed','email.failed'];
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=value=>String(value??'').replace(/[\r\n\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,160);
const email=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value||''));
function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
async function read(request,max=16000){const reader=request.body?.getReader();if(!reader)return '';const parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Request too large');}parts.push(value);}return Buffer.concat(parts).toString('utf8');}

export function verifyBookingEmailWebhook(raw,headers,secret,now=Date.now()){
  const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp'),signature=headers.get('svix-signature');
  if(!id||id.length>200||!/^\d{10,12}$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300||!secret?.startsWith('whsec_'))return false;
  const expected=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(id+'.'+timestamp+'.'+raw).digest('base64');
  return String(signature||'').split(' ').some(part=>part.startsWith('v1,')&&equal(part.slice(3),expected));
}

export function bookingEmailContent(job,config){
  const p=job.payload||{},b=p.booking||{},owner=p.audience==='owner',cancelled=p.kind==='cancelled';
  const business=line(p.business)||'Your business',customer=line(b.name)||'Customer';
  const heading={confirmed:owner?'New booking':'Your booking is confirmed',rescheduled:owner?'Booking updated':'Your booking has changed',cancelled:owner?'Booking cancelled':'Your booking is cancelled',reminder:'Your booking is tomorrow'}[p.kind]||'Your booking';
  const origin=new URL(config.public_url);if(origin.protocol!=='https:')throw Error('Invalid booking site');
  const manage=new URL('/',origin);if(owner)manage.hash='bookings';else{manage.searchParams.set('salon',String(p.slug||''));manage.hash='manage/'+encodeURIComponent(b.id||'');}
  const date=/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')?new Date(b.date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):String(b.date||'');
  const when=date+' at '+String(b.time||'')+' (UK time)';
  const amount=Number.isFinite(Number(b.price))?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(b.price)):'';
  const intro=owner?`${customer} ${cancelled?'cancelled a booking.':p.kind==='rescheduled'?'has an updated booking.':'has a new booking.'}`:cancelled?'Your booking has been cancelled.':p.kind==='reminder'?`A reminder of your booking with ${business}.`:`Hello ${customer}, here are your booking details with ${business}.`;
  const details=[['Service',b.serviceName],['Date and time',when],['Team member',p.staff_name],['Location',p.address],['Service price',amount]].filter(([,v])=>v);
  if(owner){details.push(['Customer',customer],['Customer email',b.email]);if(b.phone)details.push(['Customer phone',b.phone]);}
  const button=owner?'Open your bookings':cancelled?'View booking':'Manage your booking';
  const color=/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'#77504e';
  const text=[business+' via JovaBook',heading,intro,...details.map(([k,v])=>k+': '+v),'',button+': '+manage.href,p.reply_to?'Questions? Contact '+p.reply_to:'',p.phone||'','Sent by JovaBook for '+business+'.'].filter(Boolean).join('\n');
  const html=`<!doctype html><html lang="en"><body style="margin:0;background:#f0ebe6;color:#2b221e;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border-radius:20px"><tr><td style="padding:30px 30px 24px;border-bottom:1px solid #e5dcd5"><strong style="font-size:20px">${escape(business)}</strong><div style="font-size:12px;color:#82766e;margin-top:7px">Booking updates via JovaBook</div></td></tr><tr><td style="padding:30px"><h1 style="font-size:26px;line-height:1.25;margin:0 0 18px">${escape(heading)}</h1><p style="font-size:15px;line-height:1.6;margin:0 0 24px">${escape(intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${details.map(([k,v])=>`<tr><td style="padding:12px 12px 12px 0;border-bottom:1px solid #eee8e3;font-size:13px;color:#82766e;vertical-align:top">${escape(k)}</td><td style="padding:12px 0;border-bottom:1px solid #eee8e3;font-size:14px;text-align:right;word-break:break-word">${escape(v)}</td></tr>`).join('')}</table><p style="margin:28px 0"><a href="${escape(manage.href)}" style="display:inline-block;background:${color};color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:bold">${escape(button)}</a></p>${email(p.reply_to)?`<p style="font-size:13px;line-height:1.6;color:#82766e">Questions? Reply to this email to contact ${escape(business)}.</p>`:''}<p style="font-size:11px;line-height:1.6;color:#82766e;margin:24px 0 0">Sent by JovaBook for ${escape(business)}. Keep your booking link private.</p></td></tr></table></td></tr></table></body></html>`;
  if(!email(job.recipient)||!email(config.sender))throw Error('Invalid email address');
  return {from:`"${business.replace(/["\\]/g,'')} via JovaBook" <${config.sender}>`,to:[job.recipient],...(email(p.reply_to)?{reply_to:p.reply_to}:{}),subject:line(business+': '+heading),text,html,
    tags:[{name:'app',value:'jovabook'},{name:'kind',value:p.kind},{name:'audience',value:owner?'owner':'customer'}]};
}

export function createBookingEmailHandlers({env=process.env,send=fetch,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  const configured=()=>env.JOVABOOK_EMAIL_WORKER_TOKEN?.length===64&&env.JOVABOOK_SUPABASE_URL&&env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY;
  async function db(action,payload={}){
    const url=new URL('/rest/v1/rpc/booking_email_worker',env.JOVABOOK_SUPABASE_URL);
    const r=await send(url.href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:env.JOVABOOK_EMAIL_WORKER_TOKEN,p_action:action,p_payload:payload}),signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw Error('Email database request failed');return r.json();
  }
  async function provider(path,method='GET',body,key){
    const r=await send('https://api.resend.com'+path,{method,headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
    let data;try{data=await r.json();}catch{data={};}return {ok:r.ok,status:r.status,data};
  }
  async function worker(request){
    const auth=request.headers.get('authorization');if(!equal(auth,'Bearer '+env.JOVABOOK_EMAIL_WORKER_TOKEN)||!env.JOVABOOK_EMAIL_WORKER_TOKEN)return reply(401,{ok:false,error:'Unauthorized'});
    if(!configured()||!env.RESEND_API_KEY)return reply(503,{ok:false,error:'Email delivery is not configured.'});
    let body;try{const raw=await read(request);body=raw?JSON.parse(raw):{};if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}catch{return reply(400,{ok:false,error:'Invalid request'});}
    try{
      const action=body.action||'run';
      if(action==='status')return reply(200,{ok:true,...await db('health')});
      if(action==='setup'){
        const endpoint=new URL('/api/jovabook/email/webhook',request.url).href;
        const existing=await provider('/webhooks?limit=100');if(!existing.ok)return reply(502,{ok:false,error:'The Resend key cannot manage delivery webhooks.',provider_status:existing.status});
        let hook=existing.data.data?.find(h=>h.endpoint===endpoint);
        if(hook){
          const detail=await provider('/webhooks/'+encodeURIComponent(hook.id));if(!detail.ok)throw Error('Webhook setup failed');hook=detail.data;
          if(hook.status!=='enabled'||!EVENTS.every(e=>hook.events?.includes(e))){
            const updated=await provider('/webhooks/'+encodeURIComponent(hook.id),'PATCH',{status:'enabled',events:[...new Set([...(hook.events||[]),...EVENTS])]});
            if(!updated.ok)throw Error('Webhook activation failed');
          }
        }
        else{const created=await provider('/webhooks','POST',{endpoint,events:EVENTS});if(!created.ok)return reply(502,{ok:false,error:'Delivery webhook could not be created.',provider_status:created.status});hook=created.data;}
        if(!hook.signing_secret)throw Error('Missing webhook signing secret');
        await db('webhook_config',{id:hook.id,secret:hook.signing_secret});return reply(200,{ok:true,webhook_configured:true});
      }
      if(action==='self-test'){
        const cfg=await db('config'),results=[];
        for(const expected of ['Delivered','Bounced']){
          const recipient=expected==='Delivered'?'delivered+jovabook@resend.dev':'bounced+jovabook@resend.dev';
          const key='jovabook-probe/'+new Date(now()).toISOString().slice(0,10)+'/'+expected;
          const r=await provider('/emails','POST',{from:'JovaBook <'+cfg.sender+'>',to:[recipient],subject:'JovaBook email delivery check',text:'This message tests JovaBook delivery handling using the official Resend simulator.'},key);
          if(!r.ok||!r.data.id)return reply(502,{ok:false,error:'Provider delivery check failed.',provider_status:r.status,provider_code:line(r.data.name||'unknown')});
          await db('probe',{provider_id:r.data.id,expected});results.push({expected,accepted:true});await wait(600);
        }
        return reply(200,{ok:true,tests:results});
      }
      if(action!=='run')return reply(400,{ok:false,error:'Unknown operation'});
      const cfg=await db('config');if(!cfg.enabled)return reply(200,{ok:true,enabled:false,processed:0});
      const jobs=await db('claim');let processed=0,failed=0,retry=0;
      for(const job of jobs){
        // Any uncertain send is retried with identical content and the same key.
        // The database stops retries before Resend's 24-hour key retention expires.
        let mail;
        try{mail=job.provider_payload||bookingEmailContent(job,cfg);mail=await db('prepare',{id:job.id,lease:job.lease,mail});if(!mail)continue;}
        catch{await db('finish',{id:job.id,lease:job.lease,retry:false,error:'Email content could not be prepared.'});failed++;continue;}
        let result;
        try{result=await provider('/emails','POST',mail,'jovabook-email/'+job.id);}
        catch{await db('finish',{id:job.id,lease:job.lease,retry:true,error:'The provider response was not received. Retrying safely.'});retry++;continue;}
        if(result.ok&&result.data.id){await db('finish',{id:job.id,lease:job.lease,provider_id:result.data.id});processed++;}
        else{const again=result.status===429||result.status>=500;await db('finish',{id:job.id,lease:job.lease,retry:again,error:again?'Email service is busy. Waiting to retry.':'Email service rejected this message.'});if(again)retry++;else failed++;}
        await wait(600);
      }
      return reply(200,{ok:true,enabled:true,processed,retry,failed});
    }catch{return reply(503,{ok:false,error:'Email processing is temporarily unavailable.'});}
  }
  async function webhook(request){
    if(!configured())return reply(503,{ok:false});
    let raw;try{raw=await read(request,128000);}catch{return reply(413,{ok:false});}
    try{
      const cfg=await db('config');if(!verifyBookingEmailWebhook(raw,request.headers,cfg.webhook_secret,now()))return reply(400,{ok:false,error:'Invalid signature'});
      const event=JSON.parse(raw);if(!EVENTS.includes(event.type))return reply(200,{ok:true,ignored:true});
      if(typeof event.data?.email_id!=='string'||!Number.isFinite(Date.parse(event.created_at)))return reply(400,{ok:false,error:'Invalid event'});
      await db('event',{event_id:request.headers.get('svix-id'),provider_id:event.data.email_id,type:event.type,at:event.created_at});
      return reply(200,{ok:true});
    }catch{return reply(503,{ok:false,error:'Delivery update could not be saved.'});}
  }
  return {worker,webhook};
}
