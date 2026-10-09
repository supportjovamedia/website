'use client';
import {useEffect,useRef,useState} from 'react';
import {DateTime} from 'luxon';
import {ArrowUpRight,Check,ChevronLeft,ChevronRight,Clock,LoaderCircle,MapPin,Phone,Scissors,UserRound} from 'lucide-react';
import {bookingApi as api} from './api';
import ServiceMenu from './ServiceMenu';
import {draftKey,parseDraft} from '@/lib/booking/draft.mjs';

const money=(p,c='GBP')=>new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(p/100);
const localToday=zone=>DateTime.now().setZone(zone).toISODate();

export default function BookingFlow({slug}){
 const [catalog,setCatalog]=useState(null),[account,setAccount]=useState(null),[service,setService]=useState(null),[staff,setStaff]=useState('');
 const [date,setDate]=useState(''),[month,setMonth]=useState(DateTime.now().startOf('month')),[slots,setSlots]=useState([]),[slot,setSlot]=useState(null);
 const [step,setStep]=useState(1),[guest,setGuest]=useState(false),[busy,setBusy]=useState(false),[submitting,setSubmitting]=useState(false),[error,setError]=useState('');
 const [guestDetails,setGuestDetails]=useState({first_name:'',last_name:'',email:'',phone:''});
 const requestId=useRef(null),restore=useRef(null),heading=useRef(null),stepChanged=useRef(false);
 useEffect(()=>{
  let alive=true;requestId.current=crypto.randomUUID();
  api('customer/me').then(v=>{if(alive)setAccount(v);}).catch(()=>{});
  api('public/catalog?slug='+encodeURIComponent(slug)).then(v=>{
   if(!alive)return;setCatalog(v);const now=DateTime.now().setZone(v.business.timezone);setDate(now.toISODate());setMonth(now.startOf('month'));
   const params=new URLSearchParams(location.search);let draft=null;
   try{if(params.has('resume'))draft=parseDraft(sessionStorage.getItem(draftKey(slug)),slug);else sessionStorage.removeItem(draftKey(slug));}catch{}
   if(draft){const selected=v.services.find(s=>s.id===draft.serviceId);if(selected){restore.current=draft;requestId.current=draft.requestId;setService(selected);setStaff(draft.staff);setDate(draft.date);setMonth(DateTime.fromISO(draft.date,{zone:v.business.timezone}).startOf('month'));setGuest(params.has('guest')||draft.guest);setStep(2);return;}}
   if(params.has('resume'))setError('Your previous selection expired. Please choose a service and time again.');
   const selected=v.services.find(s=>s.id===Number(params.get('service')));if(selected){setService(selected);setStep(2);}
  }).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[slug]);
 useEffect(()=>{
  if(!service||!catalog||!date)return;let alive=true;setSlot(null);setBusy(true);setSlots([]);
  api(`public/slots?business=${catalog.business.id}&service=${service.id}&date=${date}${staff?'&staff='+staff:''}`).then(v=>{
   if(!alive)return;setSlots(v);
   if(restore.current){const wanted=restore.current.slot;restore.current=null;const match=v.find(s=>s.staff_id===wanted.staff_id&&Date.parse(s.starts_at)===Date.parse(wanted.starts_at));if(match){setSlot(match);setStep(3);}else{setStep(2);setError('That time is no longer available. Please choose another time.');}}
  }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setBusy(false);});
  return()=>{alive=false;};
 },[catalog,service,staff,date]);
 useEffect(()=>{if(stepChanged.current)heading.current?.focus();stepChanged.current=true;},[step,guest]);
 function move(next){setError('');if(next<3&&!account)setGuest(false);setStep(next);}
 function saveSelection(){
  sessionStorage.setItem(draftKey(slug),JSON.stringify({slug,savedAt:Date.now(),serviceId:service.id,staff,date,slot:{staff_id:slot.staff_id,starts_at:slot.starts_at},guest:false,requestId:requestId.current}));
 }
 function signIn(){try{if(service&&slot){saveSelection();location.assign('/preview/booking/account?resume=1');}else location.assign('/preview/booking/account');}catch{setError('Your browser could not save this selection. Allow session storage or continue as a guest.');}}
 function useAccount(){setError('');if(account)setGuest(false);else signIn();}
 async function submit(e){
  e.preventDefault();if(submitting)return;setSubmitting(true);setError('');
  try{
   const values=Object.fromEntries(new FormData(e.currentTarget));
   await api('public/book',{...values,guest,use_account:!!account&&!guest,business_id:catalog.business.id,service_id:service.id,staff_id:slot.staff_id,starts_at:slot.starts_at,request_id:requestId.current});
   try{sessionStorage.removeItem(draftKey(slug));}catch{}
   location.assign('/preview/booking/confirmation');
  }catch(e){setError(e.message);setSubmitting(false);}
 }
 if(!catalog)return <main className="loading" role="status">{error||'Opening the booking page...'}</main>;
 const {business,services,staff:people,links}=catalog,zone=business.timezone;
 const eligible=people.filter(p=>!service||links.some(l=>l.staff_id===p.id&&l.service_id===service.id));
 const times=[...new Set(slots.map(s=>s.time))],first=month.startOf('month');
 const cells=Array.from({length:42},(_,i)=>first.minus({days:first.weekday%7}).plus({days:i}));
 const signedIn=!!account&&!guest,choice=step===3&&!signedIn&&!guest;
 const parts=(signedIn?account.name:'')?.trim().split(/\s+/)||[];
 return <main className="booking-page">
  <nav aria-label="Booking navigation"><a href="/preview/booking" className="studio-wordmark">{business.name}</a>{signedIn?<div className="booking-nav-actions"><a href="/preview/booking/account" className="text-btn"><UserRound size={17}/>My appointments</a><button type="button" className="text-btn" onClick={()=>{setGuest(true);setError('');}}>Book as guest</button></div>:<button type="button" className="text-btn" onClick={useAccount}><UserRound size={17}/>{account?'Use my account':'Sign in'}</button>}</nav>
  <div className="booking-layout"><aside className="booking-aside"><div className="studio-badge"><Scissors size={34}/></div><span className="pill">Your appointment</span><h1>{business.name}</h1><p>{business.description}</p><div className="contact-line"><MapPin size={18}/><span>{business.address}</span></div><div className="contact-line"><Phone size={18}/><span>{business.phone}</span></div><div className="booking-note"><Clock size={20}/><div><strong>Cancellation policy</strong><p>Cancel with at least {business.cancellation_notice_hours} hours' notice. Contact the studio to manage a guest booking.</p></div></div></aside>
  <section className="booking-content" aria-label="Book an appointment">
   <ol className="steps" aria-label="Booking progress">{['Service','Date & time','Your details'].map((label,i)=><li key={label}><button type="button" aria-current={step===i+1?'step':undefined} className={step===i+1?'current':step>i+1?'complete':''} disabled={step<i+1||submitting} onClick={()=>move(i+1)}><span>{step>i+1?<Check size={14}/>:i+1}</span>{label}</button></li>)}</ol>
   {step===1?<><h2 ref={heading} tabIndex={-1} className="booking-step-title">Choose a service</h2><p className="muted">Choose a service to get started.</p><ServiceMenu services={services} categories={catalog.categories} selected={service} currency={business.currency} phone={business.phone} onSelect={s=>{restore.current=null;setService(s);setStaff('');setError('');}}/><div className="booking-actions"><button type="button" className="primary" disabled={!service} onClick={()=>move(2)}>Choose a time <ChevronRight size={17}/></button></div></>:null}
   {step===2?<><h2 ref={heading} tabIndex={-1} className="booking-step-title">Choose date and time</h2><p className="muted">{service.name} · {service.duration_minutes} minutes · {money(service.price_pence,business.currency)}</p><label>Your barber or stylist<select value={staff} onChange={e=>{restore.current=null;setStaff(e.target.value);setError('');}}><option value="">Anyone available</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="date-time-grid"><div className="month-picker"><header><button type="button" className="icon-btn" aria-label="Previous month" disabled={month.toISODate()<=DateTime.now().setZone(zone).startOf('month').toISODate()} onClick={()=>setMonth(month.minus({months:1}))}><ChevronLeft size={18}/></button><strong>{month.toFormat('LLLL yyyy')}</strong><button type="button" className="icon-btn" aria-label="Next month" onClick={()=>setMonth(month.plus({months:1}))}><ChevronRight size={18}/></button></header><div className="month-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}{cells.map(d=><button type="button" key={d.toISODate()} aria-label={d.toFormat('cccc, d LLLL yyyy')} aria-pressed={date===d.toISODate()} disabled={d.toISODate()<localToday(zone)||d.toISODate()>DateTime.now().setZone(zone).plus({days:business.booking_window_days}).toISODate()} className={(d.month!==month.month?'outside ':'')+(date===d.toISODate()?'selected':'')} onClick={()=>{restore.current=null;setDate(d.toISODate());setError('');}}>{d.day}</button>)}</div></div><div className="times"><h3>{DateTime.fromISO(date).toFormat('ccc, d LLL')}</h3><p className="small muted">Times in {zone}</p><p className="sr-only" role="status">{busy?'Checking availability':`${times.length} available times`}</p>{busy?<p>Checking availability...</p>:times.length?<div className="time-grid">{times.map(t=><button type="button" aria-pressed={slot?.time===t} className={slot?.time===t?'selected':''} key={t} onClick={()=>{setSlot(slots.find(s=>s.time===t));setError('');}}>{t}</button>)}</div>:<p className="empty compact">No times available. Try another day or staff member.</p>}</div></div><div className="booking-actions"><button type="button" className="text-btn" onClick={()=>move(1)}>Back</button><button type="button" className="primary" disabled={!slot||busy} onClick={()=>move(3)}>Your details <ChevronRight size={17}/></button></div></>:null}
   {step===3&&slot?<><h2 ref={heading} tabIndex={-1} className="booking-step-title">Your details</h2><p className="muted">{choice?'Choose how you would like to continue.':'A few details so the studio knows who to expect.'}</p><div className="booking-review-card"><h2>{business.name}</h2><div className="booking-review-time"><strong>{DateTime.fromISO(slot.starts_at).setZone(zone).toFormat('HH:mm')}</strong><div><b>{DateTime.fromISO(slot.starts_at).setZone(zone).toFormat('ccc d LLL')}</b><span>{service.duration_minutes} mins total</span></div></div><button type="button" className="text-btn" disabled={submitting} onClick={()=>move(2)}>Choose a different time</button><h3>{service.name}</h3><p>With {slot.staff_name}</p><div className="booking-review-row"><span>{service.duration_minutes} minutes</span><span>{money(service.price_pence,business.currency)}</span></div><div className="booking-review-row booking-review-total"><strong>Pay at venue</strong><strong>{money(service.price_pence,business.currency)}</strong></div></div>
    {choice?<div className="booking-identity-choice"><button type="button" className="primary" onClick={signIn}>Sign in / Create account <ArrowUpRight size={17}/></button><button type="button" className="outline" onClick={()=>{setGuest(true);setError('');}}>Continue as guest <ChevronRight size={17}/></button><p className="small muted">An account lets you view, cancel and rebook your appointments.</p><button type="button" className="text-btn" onClick={()=>move(2)}>Back to date & time</button></div>:<form key={signedIn?'account':'guest'} onSubmit={submit} onChange={e=>{if(!signedIn&&Object.hasOwn(guestDetails,e.target.name))setGuestDetails(previous=>({...previous,[e.target.name]:e.target.value}));}}><div className="booking-details-heading"><strong>{signedIn?'Booking with your account':'Guest details'}</strong>{guest&&!submitting?<button type="button" className="text-btn" onClick={useAccount}>{account?'Use my account':'Sign in instead'}</button>:null}</div><div className="form-grid"><label>First name<input name="first_name" required maxLength={75} autoComplete="given-name" defaultValue={signedIn?(parts[0]||''):guestDetails.first_name}/></label><label>Last name<input name="last_name" required maxLength={74} autoComplete="family-name" defaultValue={signedIn?parts.slice(1).join(' '):guestDetails.last_name}/></label></div><label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={signedIn?account.email:guestDetails.email} readOnly={signedIn}/></label><label>Phone number (optional)<input name="phone" type="tel" maxLength={40} autoComplete="tel" defaultValue={signedIn?(account.phone||''):guestDetails.phone}/></label><input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true"/><label className="check-label"><input type="checkbox" required/>I agree to the studio's cancellation policy and the use of my contact details to manage this appointment.</label><p className="small muted">No online payment is taken. Pay {money(service.price_pence,business.currency)} at the venue.</p><div className="booking-actions"><button type="button" className="text-btn" disabled={submitting} onClick={()=>move(2)}>Back</button><button className="primary" disabled={submitting}>{submitting?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>} {submitting?'Booking...':'Complete booking'}</button></div></form>}
   </>:null}
   {error?<p className="error" role="alert">{error}</p>:null}
  </section></div><footer>Powered by Jova Booking Studio <a href="/preview/booking/legal/modern-slavery">Modern Slavery Statement</a></footer>
 </main>;
}
