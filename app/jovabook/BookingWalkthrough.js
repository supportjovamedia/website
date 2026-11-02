"use client";

import {useRef,useState} from 'react';
import s from './BookingWalkthrough.module.css';

// Deliberately local visual state only. No booking APIs, persistence or customer input.
const services=[{id:'brow',name:'Brow shape & tint',category:'Brows & lashes',duration:30,price:25},{id:'lash',name:'Lash lift',category:'Brows & lashes',duration:60,price:55},{id:'gel',name:'Gel manicure',category:'Nails',duration:45,price:35}];
const days=[{label:'Mon 9',full:'Monday 9 November'},{label:'Tue 10',full:'Tuesday 10 November'},{label:'Wed 11',full:'Wednesday 11 November'},{label:'Thu 12',full:'Thursday 12 November'}];
const times=['09:00','10:30','12:00','14:30'];
const steps=['Choose service','Date & time','Your details','Review'];

export default function BookingWalkthrough(){
 const[step,setStep]=useState(0),[service,setService]=useState(services[0]),[day,setDay]=useState(0),[time,setTime]=useState('');
 const heading=useRef(null);
 function go(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
 function restart(){setService(services[0]);setDay(0);setTime('');go(0);}
 return <section id="customer-booking" className={s.section} aria-labelledby="booking-walkthrough-title">
  <header className={s.intro}><div><h2 id="booking-walkthrough-title">Let them try your booking page.</h2><p>See how clients pick a service and find a time, with your prices and availability in one place.</p></div><span className={s.previewLabel}>Interactive walkthrough</span></header>
  <div className={s.window}>
   <header className={s.business}><span className={s.monogram} aria-hidden="true">JD</span><div><strong>Jova Demo Salon</strong><span>24 High Street, London</span></div><span className={s.visualOnly}>Explore only. No booking is created.</span></header>
   <nav className={s.steps} aria-label="Booking walkthrough steps">{steps.map((label,index)=><button key={label} type="button" aria-current={index===step?'step':undefined} disabled={index>step} onClick={()=>go(index)}>{label}</button>)}</nav>
   <div className={s.body}><div className={s.content}>
    <div className={s.stage}><h3 ref={heading} tabIndex={-1}>{['Book a service','Choose a date and time','Your details','Review your booking'][step]}</h3>
    {step===0&&<><p>Choose a service to see availability.</p><div className={s.services}>{services.map(item=><button key={item.id} className={s.service} type="button" aria-pressed={service.id===item.id} onClick={()=>{setService(item);setTime('');}}><span><strong>{item.name}</strong><small>{item.category} · {item.duration} minutes</small></span><span><strong>£{item.price.toFixed(2)}</strong><small>Choose a time</small></span></button>)}</div></>}
    {step===1&&<><p>Pick one of the example dates and times below.</p><div className={s.dates} role="group" aria-label="Example booking dates">{days.map((item,index)=><button key={item.label} type="button" aria-pressed={day===index} onClick={()=>{setDay(index);setTime('');}}>{item.label}</button>)}</div><h4>Available times</h4><div className={s.times} role="group" aria-label="Example booking times">{times.map(value=><button key={value} type="button" aria-pressed={time===value} onClick={()=>setTime(value)}>{value}</button>)}</div></>}
    {step===2&&<><p>We have filled in fictional details so you can explore without entering personal information.</p><dl className={s.details}><div><dt>Name</dt><dd>Alex Morgan</dd></div><div><dt>Email</dt><dd>alex@example.test</dd></div><div><dt>Phone</dt><dd>07700 900123</dd></div></dl></>}
    {step===3&&<><p>Everything in one place before a client confirms.</p><div className={s.review}><strong>{service.name}</strong><span>{days[day].full} at {time}</span><span>{service.duration} minutes with Sam Taylor</span><span>Alex Morgan · alex@example.test</span></div><div className={s.endNote}>You have reached the end of the walkthrough. Nothing has been booked or sent.</div></>}
   </div><div className={s.actionRow}><button className={s.back} type="button" disabled={step===0} onClick={()=>go(step-1)}>Back</button><button className={s.primary} type="button" disabled={step===1&&!time} onClick={()=>step===3?restart():go(step+1)}>{['Date & time','Continue','See review','Start again'][step]}</button></div></div><aside className={s.summary} aria-label="Walkthrough booking summary"><h3>Your booking</h3><dl><div><dt>Service</dt><dd>{service.name}</dd></div><div><dt>Professional</dt><dd>Sam Taylor</dd></div><div><dt>Date</dt><dd>{step>0?days[day].label:'Choose a date'}</dd></div><div><dt>Time</dt><dd>{time||'Choose a time'}</dd></div><div className={s.total}><dt>Total</dt><dd>£{service.price.toFixed(2)}</dd></div></dl></aside></div>
  </div>
 </section>;
}
