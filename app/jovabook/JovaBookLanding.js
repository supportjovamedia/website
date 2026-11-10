"use client";

import Image from "next/image";
import {useRef, useState} from "react";
import JovaBookPlans from "./JovaBookPlans";
import {jovabookDemo} from "../../lib/jovabook-demo.mjs";

import {FaqStory} from "@/components/ScrollStories";
import {WhyJovaBook,JovaBookTestimonials,JovaBookFounderNote} from "./JovaBookProof";
import "./landing.css";
import "./pricing.css";
import "./tools.css";
import "./proof.css";

const images={
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
    "src": jovabookDemo.poster,
    "width": 1920,
    "height": 1080
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
function ProductImage({name,alt,className,priority=false}) {
  const asset=images[name];
  const industry=['salon','fitness','desk','industry-healthcare','education-black-tutor','industry-spa'].includes(name);
  const sizes=name==='booking-mobile'?'(max-width:760px) 100px, 170px':name==='website'?'(max-width:760px) 90vw, 530px':industry?'(max-width:760px) 38vw, 380px':priority?'(max-width:760px) 95vw, 660px':name==='services'||name==='clients'?'(max-width:760px) 95vw, 700px':'(max-width:760px) 95vw, 1120px';
  return <Image src={asset.src} alt={alt} width={asset.width} height={asset.height} className={className} preload={priority} sizes={sizes}/>;
}
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>}
function Check(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m5 12 4 4L20 5"/></svg>}
function TrialLink({children='Start free today'}){return <a className="button" href="#plans">{children}</a>}

const services=[{name:'Brow shape & tint',minutes:30,price:25},{name:'Lash lift',minutes:60,price:55},{name:'Gel manicure',minutes:45,price:35}];
const dates=['Mon 9 Nov','Tue 10 Nov','Wed 11 Nov'];
const times=['09:00','10:30','12:00','14:30'];
function BookingSection(){
  // Fictional preview only. No API, database, storage, personal details or submission.
  const[step,setStep]=useState(0),[service,setService]=useState(0),[date,setDate]=useState(1),[time,setTime]=useState('10:30');
  const heading=useRef(null),chosen=services[service];
  function go(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
  function restart(){setService(0);setDate(1);setTime('10:30');go(0);}
  return <section className="section booking-section ws-booking" id="booking"><div className="wrap booking-layout"><div className="feature-copy"><h2>Let clients book<br/>appointments online.</h2><p>Try the booking page below. Choose a service, pick a time and review the appointment.</p></div><div id="booking-demo" className="booking-widget"><div className="widget-brand"><span>JS</span><div><b>Jova Studio</b><small>24 High Street, London</small></div><span className="demo-tag">Interactive demo</span></div><div className="widget-body"><div className="widget-steps" aria-label="Demo progress">{['Service','Date & time','Review'].map((label,index)=><span key={label} className={step===index?'active':''} aria-current={step===index?'step':undefined}>{label}</span>)}</div><h3 ref={heading} tabIndex={-1}>{['Choose your service','Choose a date and time','Review this appointment'][step]}</h3><div className="booking-content">
  {step===0&&services.map((item,index)=><button className={`service ${index===service?'selected':''}`} key={item.name} type="button" aria-pressed={index===service} onClick={()=>setService(index)}><span><b>{item.name}</b><small>{item.minutes} minutes</small></span><strong>£{item.price}</strong></button>)}
  {step===1&&<><p className="demo-month">November 2026</p><div className="demo-days" role="group" aria-label="Example dates">{dates.map((item,index)=><button key={item} type="button" className={date===index?'selected':''} aria-pressed={date===index} onClick={()=>setDate(index)}>{item}</button>)}</div><p className="demo-month">Available times</p><div className="demo-times" role="group" aria-label="Example appointment times">{times.map(item=><button key={item} type="button" className={time===item?'selected':''} aria-pressed={time===item} onClick={()=>setTime(item)}>{item}</button>)}</div></>}
  {step===2&&<><div className="review-row"><span>Service</span><b>{chosen.name}</b></div><div className="review-row"><span>Date</span><b>{dates[date]}</b></div><div className="review-row"><span>Time</span><b>{time}</b></div><div className="review-row"><span>Total</span><b>£{chosen.price}</b></div><p className="demo-complete">Preview complete. No appointment has been made.</p></>}
  </div><div className="widget-bottom"><button className="widget-back" type="button" disabled={step===0} onClick={()=>go(step-1)}>Back</button><button className="button" type="button" onClick={()=>step===2?restart():go(step+1)}>{['Choose a date','See review','Try again'][step]}<Arrow/></button></div></div></div></div></section>;
}

const tools=[
  {id:'services',title:'Your services',description:'Set prices, durations and categories for everything clients can book.',caption:'Choose who offers each service and keep your booking page up to date from the same place.'},
  {id:'clients',title:'Your client records',description:'Keep contact details, notes and booking history together.',caption:'Find the details you need before their next visit, with past appointments and client notes in one record.'}
];
function ToolIcon({name}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='services'?<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h5"/></>:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></>}</svg>}
function ToolsSection(){
  const[selected,setSelected]=useState('services');
  const active=tools.find(tool=>tool.id===selected);
  return <section className="ws-tools ws-tools-cards" id="features" aria-labelledby="tools-title">
    <div className="ws-tools-heading"><div><h2 id="tools-title">Your services and clients,<br/>kept together.</h2><p>Set up what you offer, and keep the client information you need close to every appointment.</p></div></div>
    <div className="ws-tools-layout">
      <div className="ws-tools-selector" role="group" aria-label="Explore JovaBook tools">{tools.map(tool=><button id={`tool-${tool.id}`} className="ws-tool-choice" type="button" key={tool.id} aria-pressed={selected===tool.id} aria-controls="tool-preview" onClick={()=>setSelected(tool.id)}><span className="ws-tool-icon"><ToolIcon name={tool.id}/></span><span className="ws-tool-choice-copy"><span className="ws-tool-choice-title">{tool.title}</span><span className="ws-tool-choice-description">{tool.description}</span></span></button>)}</div>
      <div className="ws-tools-preview" id="tool-preview" role="region" aria-labelledby={`tool-${selected}`}><figure><ProductImage name={selected} alt={`JovaBook ${selected} management`} className="ws-tool-image"/></figure><p aria-live="polite">{active.caption}</p></div>
    </div>
  </section>;
}

const themes=[['jova-blue','Jova Blue','#235789'],['rose-studio','Rose Studio','#954562'],['midnight-glass','Midnight Glass','#242424'],['forest','Forest','#286b55'],['warm-studio','Warm Studio','#78523b'],['amethyst','Amethyst','#6b528c']];
function WorkspaceSection(){const[selected,setSelected]=useState(0);return <section className="section workspace-section wrap ws-workspace" id="workspace"><div className="section-head center"><h2>Choose how your<br/>workspace looks.</h2><p>Six styles to make your working day feel like yours. Try a colour below. Your website and booking page keep their own branding.</p></div><div className="theme-options" role="group" aria-label="Workspace colour previews">{themes.map(([key,name,colour],index)=><button key={key} type="button" aria-pressed={index===selected} onClick={()=>setSelected(index)}><span style={{background:colour}} aria-hidden="true"/>{name}</button>)}</div><div className="theme-stage"><figure className="app-frame"><ProductImage name={`theme-${themes[selected][0]}`} alt={`${themes[selected][1]} JovaBook workspace`} className="theme-preview"/></figure></div></section>}

function PricingSection(){return <section className="section plans-section free-pricing" id="plans" aria-labelledby="plans-title"><div className="wrap"><div className="section-head center"><h2 id="plans-title">Start free.<br/>Grow at your own pace.</h2><p>A one-page website and online bookings, free. Add Stripe deposits when you upgrade. Every plan has 0% booking commission.</p></div><JovaBookPlans/></div></section>;}

function ReferralSection(){return <section className="jb-referral-section" id="refer-a-business" aria-labelledby="referral-title"><div className="jb-referral-offer"><div><span className="jb-referral-tag">Referral programme</span><h2 id="referral-title">Refer 3 businesses.<br/>Earn a month free.</h2><p>Know a business owner who would love simpler bookings? Share your personal link. When three referred businesses complete their first paid monthly cycle and qualify, you earn a free base subscription month.</p><div className="jb-referral-actions"><a className="button" href="https://book.jovamedia.com/?portal=owner#referrals">Get your referral link</a><a href="#referral-details">How it works</a></div><small>Available on Free, Solo and Team. Extra Team seats remain payable. Terms below.</small></div><ol><li><span>1</span><div><h3>Share your link</h3><p>Find it in your dashboard under Referrals.</p></div></li><li><span>2</span><div><h3>They complete a paid month</h3><p>They join using your code, then pay for and complete a monthly Solo or Team cycle.</p></div></li><li><span>3</span><div><h3>You both earn rewards</h3><p>They earn their next base month free after approval. Every three qualifying referrals earn yours.</p></div></li></ol></div><details id="referral-details"><summary>Referral terms and what your free month covers</summary><div><p>Referrals must be new, distinct businesses, attributed before their business account is created. Joining Free alone does not count. Qualification requires a completed, paid monthly billing cycle and an eligibility review. Self-referrals, duplicates, failed payments and refunded or disputed qualifying payments are excluded.</p><p>Free members earn a month of Solo without entering a card or starting an automatically renewing paid subscription. Solo members earn a Solo base month. Team members earn £25 off a monthly Team renewal; extra seats, message packs and other charges remain payable. Paid subscriptions resume their normal price afterwards.</p><p>Rewards are approved and applied one at a time to an eligible monthly renewal. Annual invoices are excluded. If the next invoice has already been issued, the reward is held for the following eligible renewal. Each group of three qualifying businesses earns another referrer reward. Your referred business name and referral progress are shared with your referrer, with no client or payment details.</p></div></details></section>;}

function FaqSection({faqs}){return <div id="questions" className="ws-original-faq"><FaqStory items={faqs.map(({question,answer})=>[question,answer])} introduction="About bookings, your website, plans and getting started." contactHref="mailto:support.jovamedia@gmail.com" contactLabel="Ask the JovaMedia team" showArtwork={false}/></div>}

function ClosingSection(){return <section className="mp-closing"><div className="mp-closing-panel"><div><h2>Your next booking<br/>starts here.</h2><p>Set up your services, choose your working hours<br/>and give clients a simpler way to book.</p><TrialLink/></div><div className="mp-final-art"><div className="mp-final-name">JovaBook</div><div className="mp-final-slot"><span><Check/></span><div><b>You’re in the diary.</b><span>We’ll see you soon.</span></div></div></div></div></section>}

export default function JovaBookLanding({faqs}){
  const film=useRef(null),video=useRef(null);
  function openVideo(){film.current?.showModal();}
  return <main className="ws" aria-labelledby="jovabook-title">
    <section className="ws-hero" data-website-intro><div className="ws-hero-inner"><div className="ws-hero-copy"><div className="ws-product-name">JovaBook</div><h1 id="jovabook-title">Booking system<br/>for service<br/>businesses.</h1><p>{"Your own booking link, one-page website and diary. Start free with 20 bookings a month and pay 0% booking commission. Upgrade for Stripe deposits when your diary grows."}</p><div className="ws-hero-actions"><a className="button" href="#plans">Start free today</a><a className="button ws-hero-login" href="https://book.jovamedia.com/login">Log in</a></div></div><div className="ws-hero-art"><div className="ws-disc"></div><figure className="ws-hero-calendar"><ProductImage name="calendar-desktop" alt="The JovaBook calendar with a full week of appointments" priority /></figure><figure className="ws-hero-phone"><ProductImage name="booking-mobile" alt="A client booking an appointment on their phone" priority /></figure><div className="ws-booked"><span className="ws-check">{"✓"}</span><div><b>{"Booked. In your diary."}</b><span>{"Your client chose the time."}</span></div></div></div></div></section>
<section className="ws-demo" id="demo"><div className="ws-demo-copy"><h2>{"Everything your business needs to take bookings and grow."}</h2><p>{"Explore online booking, your calendar and client records in this JovaBook demo."}</p><button className="ws-text-button" onClick={openVideo}>{"Watch the demo "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></button></div><button className="ws-film" aria-label="Play the JovaBook product demo" onClick={openVideo}><ProductImage name="demo-poster" alt="JovaBook product demo preview" /><span className="ws-play" aria-hidden="true"><span className="ws-play-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5Z"/></svg></span><span className="ws-play-copy">Play demo</span></span></button></section>
<WhyJovaBook/>
<JovaBookTestimonials/>
<JovaBookFounderNote/>
<section className="ws-calendar" id="calendar"><div className="ws-scene-heading"><h2>Your calendar, organised<br/>around your working day.</h2><p>See appointments and available time in day, week or month view, with colour-coded services and your team’s working hours. Open a booking to see the details, or add one straight into your diary.</p></div><div className="ws-calendar-stage"><figure><ProductImage name="calendar-desktop" alt="A full JovaBook weekly calendar, with colour-coded appointments" /></figure></div></section>
<BookingSection/>
<ToolsSection/>
<section className="ws-payments"><div className="ws-payments-inner"><div className="ws-payment-copy"><h2>Take booking deposits<br/>through Stripe.</h2><p>{"Choose a deposit percentage for your business. Clients pay through Stripe when they book, and the money goes to your connected account. Included on Solo and Team."}</p><a href="#questions" className="ws-light-link">{"About deposits and cancellations "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></a></div><div className="ws-payment-art"><div className="ws-payment-disc"></div><div className="ws-payment-receipt"><div className="ws-receipt-top"><span>{"Jova Studio"}</span><b>{"Booking deposit"}</b></div><p>{"Cut & finish"}</p><div className="ws-receipt-total">{"£10"}<span>{".00"}</span></div><span className="ws-payment-success">{"✓ Paid to your Stripe account"}</span><dl><div><dt>{"Appointment price"}</dt><dd>{"£50.00"}</dd></div><div><dt>{"20% deposit paid"}</dt><dd>{"£10.00"}</dd></div><div><dt>{"Remaining at your business"}</dt><dd>{"£40.00"}</dd></div></dl></div></div></div><div className="ws-reminder"><div className="ws-message"><div><span className="ws-message-icon">{"✉"}</span><b>{"Jova Studio"}</b><span>{"now"}</span></div><p>{"Reminder: next appt at 10:30am on Wednesday, 11 Nov. Jova Studio, 24 High Street."}</p></div><div><h3>{"Help clients remember"}<br />{"their appointment."}</h3><p>{"Free includes 50 emails a month. Solo includes 100 emails and 60 SMS reminders. Team includes the same allowance for every staff seat."}</p></div></div></section>
<section className="ws-website" id="website"><div className="ws-website-copy"><h2>{"Your one-page website,"}<br />{"connected to your booking page."}</h2><p>{"A ready-made one-page website at yourname.jovamedia.com. Add your business name, logo, description, opening hours and contact details, with online booking built in."}</p><div className="ws-website-detail"><h3>{"Make it your own."}</h3><p>{"Choose your image and colours, write your introduction and add your contact details from your dashboard."}</p></div><div className="ws-website-detail"><h3>{"Keep everything connected."}</h3><p>{"Your services, opening hours and booking link belong to the same business. Share one clear address with your clients."}</p></div><p className="ws-website-included">{"Included on every plan, even Free. Solo and Team also let you embed bookings on your existing website."}</p><a className="button" href="#plans">{"Find your plan"}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></a></div><div className="ws-site-frame"><div className="ws-site-address">{"jovastudio.jovamedia.com"}</div><ProductImage name="website" alt="The entire Jova Studio business website, without cropping" /></div></section>
<WorkspaceSection/>
<section className="ws-insights"><div className="ws-scene-heading"><h2>Understand your bookings<br/>and returning clients.</h2><p>See popular services, returning clients and people who are due another visit. Solo and Team include full Insights and period comparisons.</p></div><figure><ProductImage name="insights" alt="JovaBook insights showing popular services and returning clients" /></figure></section>
<section className="section industry-section wrap ws-industries"><div className="section-head "><h2>{"Scheduling software"}<br />{"for service businesses."}</h2><p>{"Your services, your prices and the hours you work. Set up JovaBook around the appointments your clients book."}</p></div><div className="industry-grid"><article><ProductImage name="salon" alt="Hair & beauty" /><div><h3>{"Hair & beauty"}</h3><p>{"Hair salons, nails, barbers and beauty treatments"}</p></div></article><article><ProductImage name="industry-healthcare" alt="Healthcare" /><div><h3>{"Healthcare"}</h3><p>{"Dentists, chiropractors and therapists"}</p></div></article><article><ProductImage name="education-black-tutor" alt="Education & tutors" /><div><h3>{"Education & tutors"}</h3><p>{"Tuition centres and private lessons"}</p></div></article><article><ProductImage name="fitness" alt="Coaches & trainers" /><div><h3>{"Coaches & trainers"}</h3><p>{"Personal training and one-to-one sessions"}</p></div></article><article><ProductImage name="desk" alt="Consultation services" /><div><h3>{"Consultation services"}</h3><p>{"Consultants, advisers and appointments"}</p></div></article><article><ProductImage name="industry-spa" alt="Spa & wellness" /><div><h3>{"Spa & wellness"}</h3><p>{"Spas, facials and relaxation treatments"}</p></div></article></div></section>
<PricingSection/>
<ReferralSection/>
<FaqSection faqs={faqs}/>
<ClosingSection/>
    <dialog ref={film} className="movie-modal" aria-label="JovaBook product demo" onClose={()=>video.current?.pause()} onClick={e=>{if(e.target===e.currentTarget)film.current.close();}}><button className="modal-close" type="button" autoFocus onClick={()=>film.current.close()}>Close</button><video ref={video} controls playsInline preload="none" src={jovabookDemo.src} poster={jovabookDemo.poster}>Your browser does not support video. <a href={jovabookDemo.src}>Watch the JovaBook demo</a>.</video></dialog>
  </main>;
}

