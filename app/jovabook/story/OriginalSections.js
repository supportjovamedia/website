"use client";import {useRef,useState} from 'react';const images={
  "calendar-desktop": {
    "src": "/jovabook/calendar-desktop.webp",
    "width": 2880,
    "height": 1920
  },
  "booking-mobile": {
    "src": "/jovabook/booking-mobile.webp",
    "width": 750,
    "height": 1622
  },
  "services": {
    "src": "/jovabook/services.webp",
    "width": 2880,
    "height": 1920
  },
  "clients": {
    "src": "/jovabook/clients.webp",
    "width": 2880,
    "height": 1920
  },
  "demo-poster": {
    "src": "/jovabook/demo-poster-clean.webp",
    "width": 1600,
    "height": 900
  },
  "website": {
    "src": "/jovabook/website-optimized.webp",
    "width": 2880,
    "height": 3932
  },
  "insights": {
    "src": "/jovabook/insights.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-jova-blue": {
    "src": "/jovabook/theme-jova-blue.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-forest": {
    "src": "/jovabook/theme-forest.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-amethyst": {
    "src": "/jovabook/theme-amethyst.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-midnight-glass": {
    "src": "/jovabook/theme-midnight-glass.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-rose-studio": {
    "src": "/jovabook/theme-rose-studio.webp",
    "width": 2880,
    "height": 1920
  },
  "theme-warm-studio": {
    "src": "/jovabook/theme-warm-studio.webp",
    "width": 2880,
    "height": 1920
  },
  "industry-healthcare": {
    "src": "/jovabook/industry-healthcare.webp",
    "width": 1600,
    "height": 1067
  },
  "education-black-tutor": {
    "src": "/jovabook/education-black-tutor.webp",
    "width": 1448,
    "height": 1086
  },
  "industry-spa": {
    "src": "/jovabook/industry-spa.webp",
    "width": 1600,
    "height": 1067
  },
  "salon": {
    "src": "/websites/photography/salon-website-design-hero-main.webp",
    "width": 1280,
    "height": 854
  },
  "fitness": {
    "src": "/home-agency/fitness.webp",
    "width": 1285,
    "height": 1800
  },
  "desk": {
    "src": "/home-agency/desk.webp",
    "width": 1200,
    "height": 1800
  }
};

function ProductImage({name,alt,priority=false}){const a=images[name];return <img src={a.src} width={a.width} height={a.height} alt={alt} loading={priority?'eager':'lazy'}/>;}
const services=[{name:'Brow shape & tint',minutes:30,price:25},{name:'Lash lift',minutes:60,price:55},{name:'Gel manicure',minutes:45,price:35}];
const dates=['Mon 9 Nov','Tue 10 Nov','Wed 11 Nov'];
const times=['09:00','10:30','12:00','14:30'];
function BookingSection(){
  // Fictional preview only. No API, database, storage, personal details or submission.
  const[step,setStep]=useState(0),[service,setService]=useState(0),[date,setDate]=useState(1),[time,setTime]=useState('10:30');
  const heading=useRef(null),chosen=services[service];
  function go(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
  function restart(){setService(0);setDate(1);setTime('10:30');go(0);}
  return <section className="section booking-section ws-booking" id="booking"><div className="wrap booking-layout"><div className="feature-copy"><h2>See how your clients book.</h2><p>Try the booking page below. Choose a service, pick a time and review the appointment.</p></div><div id="booking-demo" className="booking-widget"><div className="widget-brand"><span>JS</span><div><b>Jova Studio</b><small>24 High Street, London</small></div></div><div className="widget-body"><div className="widget-steps" aria-label="Demo progress">{['Service','Date & time','Review'].map((label,index)=><span key={label} className={step===index?'active':''} aria-current={step===index?'step':undefined}>{label}</span>)}</div><h3 ref={heading} tabIndex={-1}>{['Choose your service','Choose a date and time','Review this appointment'][step]}</h3><div className="booking-content">
  {step===0&&services.map((item,index)=><button className={`service ${index===service?'selected':''}`} key={item.name} type="button" aria-pressed={index===service} onClick={()=>setService(index)}><span><b>{item.name}</b><small>{item.minutes} minutes</small></span><strong>£{item.price}</strong></button>)}
  {step===1&&<><p className="demo-month">November 2026</p><div className="demo-days" role="group" aria-label="Example dates">{dates.map((item,index)=><button key={item} type="button" className={date===index?'selected':''} aria-pressed={date===index} onClick={()=>setDate(index)}>{item}</button>)}</div><p className="demo-month">Available times</p><div className="demo-times" role="group" aria-label="Example appointment times">{times.map(item=><button key={item} type="button" className={time===item?'selected':''} aria-pressed={time===item} onClick={()=>setTime(item)}>{item}</button>)}</div></>}
  {step===2&&<><div className="review-row"><span>Service</span><b>{chosen.name}</b></div><div className="review-row"><span>Date</span><b>{dates[date]}</b></div><div className="review-row"><span>Time</span><b>{time}</b></div><div className="review-row"><span>Total</span><b>£{chosen.price}</b></div><p className="demo-complete">Preview complete. No appointment has been made.</p></>}
  </div><div className="widget-bottom">{step>0&&<button className="widget-back" type="button" onClick={()=>go(step-1)}>Back</button>}<button className="button" type="button" onClick={()=>step===2?restart():go(step+1)}>{['Choose a date','See review','Try again'][step]}</button></div></div></div></div></section>;
}


export function OriginalHero(){
 return <section className="art-hero" data-website-intro aria-labelledby="jovabook-title">
  <div className="art-hero-scene"><div className="art-calendar"><img src="/jovabook/story/dashboard-current-5df2dc7de8.webp" alt="The current JovaBook dashboard with appointments, client records and team calendars" width="1600" height="996" fetchPriority="high"/></div><div className="art-booking-phone"><img src="/jovabook/story/calendar-phone-current-5e5232164a.webp" alt="The current JovaBook calendar on a phone" width="540" height="1217" fetchPriority="high"/></div></div>
  <div className="art-hero-copy"><h1 id="jovabook-title">Your online<br/>booking system.</h1><p>For service businesses. Your calendar, client bookings and your own website, all together.</p><div className="art-hero-actions"><a className="nv-main-button" href="#plans">Start free</a><button className="nv-secondary-button" type="button" onClick={()=>document.getElementById('local-film')?.showModal()}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5Z"/></svg><span>Watch the demo</span></button></div></div>
 </section>;
}

export function InteractiveBooking(){return <div className="ws local-booking"><BookingSection/></div>;}
