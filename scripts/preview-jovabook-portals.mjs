// Isolated visual preview. Never connects to Auth, a database, email, SMS or payments.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local preview only.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../booking-demo'),port=Number(process.env.JOVA_PORTAL_PREVIEW_PORT||4352);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local preview port from 1024 to 65535.');
const base='http://127.0.0.1:'+port;
const unknownCommission={recorded:true,tracking_enabled:true,available:false,settled_minor:null,invoiced_outstanding_minor:null,unbilled_minor:null,issued_credits_minor:null,unresolved_count:0,cash_collected_minor:null,cash_collected_available:false,period_start:null,period_end:null};
const paidCommission={recorded:true,tracking_enabled:true,available:true,settled_minor:1250,settled_gross_minor:1500,invoiced_outstanding_minor:350,unbilled_minor:225,issued_credits_minor:250,unresolved_count:0,cash_collected_minor:null,cash_collected_available:false,period_start:'2026-11-01T12:00:00Z',period_end:'2026-12-01T12:00:00Z'};
const businesses=[
 {id:'20000000-0000-4000-8000-000000000001',name:'QX Test Studio',slug:'qx-test-studio',account_email:'trial.owner@example.test',business_email:'hello@qx.example.test',created_at:'2026-11-02T12:00:00Z',plan:'essential',has_paid:false,billing_state:'trial',access:'active',cadence:null,trial_end:'2026-11-05T12:00:00Z',paid_until:null,cancel_at_period_end:false,staff:1,services:3,bookings:7,commission:unknownCommission,estimate:{available:false,stale:false}},
 {id:'20000000-0000-4000-8000-000000000002',name:'Fictional Paid Studio',slug:'fictional-paid-studio',account_email:'paid.owner@example.test',business_email:'bookings@paid.example.test',created_at:'2026-10-01T12:00:00Z',plan:'standard',has_paid:true,billing_state:'paid',access:'active',cadence:'annual',trial_end:'2026-10-04T12:00:00Z',paid_until:'2026-11-30T12:00:00Z',cancel_at_period_end:false,staff:4,services:8,bookings:23,commission:paidCommission,estimate:{available:true,stale:false,updated_at:'2026-11-02T11:00:00Z',period_start:'2026-11-01T12:00:00Z',period_end:'2026-12-01T12:00:00Z',cadence:'annual',commission_cadence:'monthly',new_commission_pence:125,carry_forward_pence:100,estimated_total_pence:225}},
];
const business=businesses[0],notes=new Map(),read=new Set(),batches=[{reference:'commission_preview_paid',cutoff:'2026-10-31T12:00:00Z',amount_minor:1500,issued_credits_minor:250,local_status:'paid',collection_state:'paid',settlement_kind:'credit_balance'},{reference:'commission_preview_open',cutoff:'2026-11-01T12:00:00Z',amount_minor:350,issued_credits_minor:0,local_status:'invoiced',collection_state:'not_started',settlement_kind:null}];
const bookings=[{id:'fixture-future',service_name:'Cut and finish',date:'2026-11-20',time:'10:00',staff_name:'Alex',status:'confirmed',can_cancel:true,deposit:0},{id:'fixture-soon',service_name:'Consultation',date:'2026-11-03',time:'09:00',staff_name:'Alex',status:'confirmed',can_cancel:false,cancellation_cutoff:'2026-11-02T09:00:00Z',deposit:0}];
const customer={id:'40000000-0000-4000-8000-000000000001',email:'customer@example.test',email_confirmed_at:'2026-11-01T10:00:00Z'};
const overlay='<aside style="position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:10px 20px;background:#142a3b;color:white;font:14px system-ui;display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap">Local preview: fictional records <nav><a style="color:white;margin-right:20px" href="/operator.html">Back office</a><a style="color:white" href="/customer.html?portal=customer&salon=qx-test-studio#customer/bookings">Customer portal</a></nav></aside>';
function billing(record){return {ok:true,subscription:{ever_paid:record.has_paid,plan:record.plan,cadence:record.cadence,paid_until:record.paid_until},commission:record.commission,estimate:record.estimate,batches:record.has_paid?batches:[]};}
const serve=http.createServer(async(req,res)=>{const url=new URL(req.url,base);const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};try{
 if(req.method==='POST'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>10000)return json({ok:false},413);}const args=JSON.parse(body||'{}'),p=url.pathname;
  if(p==='/auth/v1/token')return json({access_token:'local-preview-only',expires_in:3600,user:{id:customer.id}});
  if(p.endsWith('/portal_identity'))return json({ok:true,role:args.p_claim==='customer'?'customer':'operator'});
  if(p.endsWith('/operator_overview'))return json({ok:true,total:2,essential:0,standard:1,premium:0,paid_total:1,paid_active:1,trials_total:1,trials_active:1,trials_ended:0,new_this_month:1,owner_signins_today:1,commission:{...paidCommission,businesses_available:1,businesses_unavailable:1},months:[{label:'Jun',count:0},{label:'Jul',count:0},{label:'Aug',count:0},{label:'Sep',count:0},{label:'Oct',count:1},{label:'Nov',count:1}],notifications:[{id:'preview-event',salon_id:business.id,business:business.name,title:'New business registered',at:business.created_at,read:read.has('preview-event')}]});
  if(p.endsWith('/operator_read_notification')){read.add(args.p_event);return json({ok:true});}
  if(p.endsWith('/operator_businesses')){const term=String(args.p_search||'').trim().toLowerCase();return json({ok:true,total:businesses.length,businesses:businesses.filter(b=>[b.name,b.slug,b.account_email,b.business_email].join(' ').toLowerCase().includes(term))});}
  if(p.endsWith('/operator_business')){const record=businesses.find(b=>b.id===args.p_id);if(!record)return json({ok:false},404);return json({ok:true,business:record,notes:notes.get(record.id)||[],activity:[{action:'business_view',created_at:'2026-11-02T12:00:00Z'}],billing_summary:billing(record)});}
  if(p.endsWith('/operator_billing_summary')){const record=businesses.find(b=>b.id===args.p_id);return record?json(billing(record)):json({ok:false},404);}
  if(p.endsWith('/operator_add_note')){if(!businesses.some(b=>b.id===args.p_salon))return json({ok:false},404);const existing=notes.get(args.p_salon)||[];if(!existing.some(n=>n.id===args.p_request))notes.set(args.p_salon,[{id:args.p_request,body:args.p_body,created_at:new Date().toISOString()},...existing]);return json({ok:true,id:args.p_request});}
  if(p.endsWith('/public_salon')){const record=businesses.find(b=>b.slug===args.p_slug);return record?json({id:record.id,name:record.name,slug:record.slug,website_entitlement:'one-page',settings:{hours:{start:'09:00',end:'17:00',days:[1,2,3,4,5]},workspace:{website:{headline:'Welcome to '+record.name,about:'A fictional business for this local preview.'}}},categories:[],staff:[{id:'preview-staff',name:'Alex',active:true}],services:[{id:'preview-service',name:'Cut and finish',price:25,duration:30,staffIds:['preview-staff']}],busy:[],payments:{enabled:false,deposit:0}}):json(null);}
  if(p.endsWith('/public_sms_reminder_info'))return json({available:false,consent_required:true,reminder_hours:24});
  if(p.endsWith('/customer_portal_profile'))return json({ok:true,member:true});
  if(p.endsWith('/customer_portal_bookings'))return json({ok:true,business:{name:business.name,slug:business.slug},customer:{email:customer.email},bookings});
  if(p.endsWith('/customer_portal_cancel')){const booking=bookings.find(b=>b.id===args.p_booking_id);if(!booking||!booking.can_cancel)return json({ok:false});booking.status='cancelled';booking.can_cancel=false;return json({ok:true});}
  if(p.startsWith('/auth/'))return json({});return json({ok:false},404);
 }
 if(url.pathname==='/auth/v1/user')return json(customer);
 if(url.pathname==='/config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.JOVA_SUPABASE='+JSON.stringify({url:base,key:'local-preview-only'})+';');}
 let content,html=false;
 if(url.pathname==='/customer.html'){
  html=true;content='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local customer portal</title><link rel="stylesheet" href="customer-portal.css"></head><body><div id="app"></div><script src="config.js"></script><script src="customer-portal.js"></script><script>sessionStorage.setItem("jovabook-customer-auth-v1:qx-test-studio",JSON.stringify({access_token:"local-preview-only",expires_at:Date.now()/1000+3600,user:{id:"'+customer.id+'"}}));const portal=JovaCustomerPortal.create({root:document.getElementById("app"),slug:"qx-test-studio",onNavigate:r=>{location.hash=r;portal.render(r)}});portal.render(location.hash.slice(1)||"customer/bookings");</script>'+overlay+'</body></html>';
 }else{
  const publicPath=businesses.some(b=>url.pathname==='/'+b.slug),legacyPublic=url.pathname==='/'&&businesses.some(b=>url.searchParams.get('salon')===b.slug),pathname=publicPath||legacyPublic?'/index.html':url.pathname==='/'?'/operator.html':url.pathname,filename=path.resolve(root,'.'+pathname);
  if(!filename.startsWith(root+path.sep))return json({},403);content=await fs.readFile(filename);html=pathname.endsWith('.html');
  if(html){content=content.toString();if(pathname==='/operator.html')content=content.replace('</head>','<script>sessionStorage.setItem("jovabook-operator-auth-v1",JSON.stringify({access_token:"local-preview-only",expires_at:Date.now()/1000+3600,user_id:"preview-operator"}));</script></head>');content=content.replace('</body>',overlay+'</body>');}
 }
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',html?'text/html':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(content);
 }catch{json({ok:false},404);}});
serve.listen(port,'127.0.0.1',()=>console.log('Isolated portal preview: '+base+'/operator.html'));
