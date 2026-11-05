// Local-only owner UI preview. No remote authentication, database or provider access.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local preview only');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../booking-demo'),port=4432;
const seed=`(() => {
 const query=new URLSearchParams(location.search),choice=query.get('preview')||'team',plan=choice==='free'?'essential':choice==='solo'?'standard':'premium';
 const key='jovabook-essential-demo-v2',marker='jovabook-reference-preview-plan-v2';
 if(localStorage.getItem(marker)!==choice){
  const s=JovaDemoData.build();s.id='reference-studio';s.name='Fictional Studio';s.slug='fictional-studio';s.owner='Olivia';s.color='#235789';
  s.workspace={...s.workspace,appearance:{theme:'jova-blue'}};s.plan=plan;s.entitlements={offer_version:'2026-11-free-v1',plan,staff_limit:choice==='team'?3:1};s.capabilities={...s.entitlements,version:1,per_day_hours:true,booking_series:true};s.subscription={status:'active',plan,cadence:'monthly'};
  s.staff=s.staff.slice(0,choice==='team'?3:1);s.staff.forEach((m,i)=>{m.name=['Olivia Owner','Anna Stylist','Ben Barber'][i];m.color=['#7d4594','#235789','#278e65'][i]});
  s.services.forEach(service=>{service.staffIds=s.staff.map(m=>m.id)});s.bookings=s.bookings.filter(b=>s.staff.some(m=>m.id===b.staffId));
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  s.bookings=s.bookings.filter(b=>b.date!==today);['09:00','10:30','13:00','14:15','15:15','16:30','17:15','18:30','19:15'].forEach((time,i)=>{const service=s.services[i%s.services.length],c=s.customers[i%s.customers.length];s.bookings.push({id:'reference-today-'+i,date:today,time,duration:service.duration,price:service.price,serviceId:service.id,serviceName:service.name,staffId:s.staff[i%s.staff.length].id,customerId:c.id,name:c.name,email:c.email,phone:c.phone,status:i<5?'completed':'confirmed',source:'Online',deposit:0,notes:''})});
  if(choice==='free'){const month=today.slice(0,7),other=s.bookings.filter(b=>!b.date.startsWith(month)),recent=s.bookings.filter(b=>b.date.startsWith(month));s.bookings=[...other,...recent.slice(-20)]}localStorage.setItem(key,JSON.stringify({version:1,active:s.id,salons:[s],accounts:[],resets:[]}));localStorage.setItem(marker,choice);
 }
 const s=JSON.parse(localStorage.getItem(key)).salons[0];window.JOVA_LOCAL_ACCESS={access:'active',business:{id:s.id,plan},billing:{offer_version:'2026-11-free-v1',plan,seats:choice==='team'?3:1,connected:false,canCheckout:false,cadence:'monthly',booking_limit:choice==='free'?20:null,bookings_used:s.bookings.filter(b=>b.date.startsWith(new Date().toISOString().slice(0,7))).length,email_limit:choice==='free'?50:choice==='team'?300:100,emails_used:12,sms_limit:choice==='free'?0:choice==='team'?180:60,sms_used:0,email_credits:0,sms_credits:0,trial_eligible:false}};
 if(['#login','#signup','#signup/check-email','#forgot'].includes(location.hash)){sessionStorage.removeItem('jovabook-owner')}else sessionStorage.setItem('jovabook-owner','1');
})();`;
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"connect-src 'self'; frame-src 'self'; img-src 'self' data: blob:");
 if(req.method!=='GET'){res.writeHead(403,{'Content-Type':'application/json'});res.end('{"ok":false,"message":"Local preview does not contact providers."}');return;}
 if(url.pathname==='/config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.JOVA_OFFER_VERSION="2026-11-free-v1";');}
 if(url.pathname==='/__preview-seed.js'){res.setHeader('Content-Type','text/javascript');return res.end(seed);}
 const filename=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{
  let content=await fs.readFile(filename);const ext=path.extname(filename);
  if(ext==='.html')content=content.toString().replace('</head>','<style>.demo-bar{display:none!important}</style></head>').replace('<script defer src="/app.js">','<script defer src="/__preview-seed.js"></script><script defer src="/app.js">');
  if(url.pathname==='/app.js')content=content.toString().replace('accessInfo:()=>ownerAccessState,','accessInfo:()=>ownerAccessState||window.JOVA_LOCAL_ACCESS,').replace('if(isLive(s))return livePayments();','if(isLive(s)||window.JOVA_LOCAL_ACCESS)return livePayments();');
  if(url.pathname==='/deposits.js')content=content.toString().replace('const live=()=>api.isLive(salon())===true;', 'const live=()=>api.isLive(salon())===true||!!window.JOVA_LOCAL_ACCESS;').replace("const ownerRequest=body=>api.integrationRequest('deposits/settings',{salon_id:salon().id,...body});","const ownerRequest=body=>{const percent=body.deposit_percent??salon().payments.deposit_percent??20;return Promise.resolve({ok:true,data:{ready:true,connected:true,payments:{enabled:percent>0,deposit_percent:percent}}});};");
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[ext]||'application/octet-stream');res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Owner reference preview: http://127.0.0.1:'+port+'/?preview=team#dashboard'));
