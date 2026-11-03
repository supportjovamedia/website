"use client";

import Image from "next/image";
import Link from "next/link";
import {useRef, useState} from "react";
import CookieConsent from "@/components/CookieConsent";
import {jovabookMarketingPlans as plans,jovabookCoreFeatures as includedInEveryPlan,jovabookUpgradeFeatures as planComparison,jovabookSignupHref} from "@/lib/jovabook-marketing-plans.mjs";
import {FaqStory} from "@/components/ScrollStories";
import "./landing.css";
import "./pricing.css";
import "./tools.css";

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
    "src": "/jovabook/demo-poster-clean.webp",
    "width": 1600,
    "height": 900
  },
  "website": {
    "src": "/jovabook/website.webp",
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
function TrialLink({children='Start your 3-day trial'}){return <a className="button" href="#plans">{children}</a>}

const services=[{name:'Brow shape & tint',minutes:30,price:25},{name:'Lash lift',minutes:60,price:55},{name:'Gel manicure',minutes:45,price:35}];
const dates=['Mon 9 Nov','Tue 10 Nov','Wed 11 Nov'];
const times=['09:00','10:30','12:00','14:30'];
function BookingSection(){
  // Fictional preview only. No API, database, storage, personal details or submission.
  const[step,setStep]=useState(0),[service,setService]=useState(0),[date,setDate]=useState(1),[time,setTime]=useState('10:30');
  const heading=useRef(null),chosen=services[service];
  function go(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
  function restart(){setService(0);setDate(1);setTime('10:30');go(0);}
  return <section className="section booking-section ws-booking" id="booking"><div className="wrap booking-layout"><div className="feature-copy"><h2>Let clients book<br/>appointments online.</h2><p>Let clients choose a service and an available time, wherever they find you. Try the sample booking page here. Click through to review and see the journey for yourself.</p><ul className="feature-list"><li><Check/>Your services, prices and availability</li><li><Check/>A booking link for your website or Instagram bio</li><li><Check/>Book as a guest or log in</li></ul><a className="text-link" href="#booking-demo">Explore the sample booking page <Arrow/></a></div><div id="booking-demo" className="booking-widget"><div className="widget-brand"><span>JS</span><div><b>Jova Studio</b><small>24 High Street, London</small></div><span className="demo-tag">Interactive preview</span></div><div className="widget-body"><div className="widget-steps" aria-label="Demo progress">{['Service','Date & time','Review'].map((label,index)=><span key={label} className={step===index?'active':''} aria-current={step===index?'step':undefined}>{label}</span>)}</div><h3 ref={heading} tabIndex={-1}>{['Choose your service','Choose a date and time','Review this appointment'][step]}</h3><div className="booking-content">
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

function PlanFeature({label,included}){return <li className={included?'included':'excluded'}><span>{label}</span><span className="plan-availability">{included?<Check/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>}<span className="plan-sr-only">{included?'Included':'Not included'}</span></span></li>}
function PricingSection(){
  const[cadence,setCadence]=useState('monthly');
  const annual=cadence==='annual';
  return <section className="section plans-section refined-pricing" id="plans" aria-labelledby="plans-title">
    <div className="wrap">
      <div className="section-head center">
        <h2 id="plans-title">JovaBook plans<br/>and pricing.</h2>
        <p>Plans start from £20 a month, with a 3-day free trial. Your subscription starts automatically after the trial. Cancel before it ends to avoid being charged.</p>
      </div>
      <div className="cadence" role="group" aria-label="Billing frequency">
        <button type="button" aria-pressed={!annual} onClick={()=>setCadence('monthly')}>Monthly</button>
        <button type="button" aria-pressed={annual} onClick={()=>setCadence('annual')}>Yearly <span>Save 20%</span></button>
      </div>
      <div id="essential-plan" className="plan-grid">
        {plans.map((plan,index)=><article key={plan.name} className={`plan ${index===1?'recommended':''}`} aria-label={`${plan.name} plan`}>
          {index===1&&<span className="plan-popular"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></svg>Most popular</span>}
          <header className="plan-heading"><h3>{plan.name}</h3></header>
          <p className="plan-description">{plan.description}</p>
          <div className="plan-price" aria-live="polite" aria-atomic="true"><strong>£{annual?plan.annual/12:plan.monthly}</strong><span>/month</span></div>
          <p className="plan-billing">{annual?`£${plan.annual} billed yearly`:'Billed monthly'}</p>
          <a className={`button ${index!==1?'outline':''}`} href={jovabookSignupHref(plan.id,cadence)}>Start free trial</a>
          <ul aria-label={`${plan.name} features`}><PlanFeature label={plan.staffLabel} included/><PlanFeature label={plan.websiteLabel} included/>{includedInEveryPlan.map(label=><PlanFeature key={label} label={label} included/>)}{planComparison.filter(item=>index===0?['Text reminders','Slot recovery','Business Insights'].includes(item.label):index===1?item.label!=='Insights period comparisons':item.label!=='Multi-page website').map(item=><PlanFeature key={item.label} label={item.label} included={item.included[index]}/>)}</ul>
          <div className="plan-terms"><p>{plan.commission?'1% commission on online customer bookings.':'0% booking commission.'}</p><p>Payment-processing fees are separate.</p></div>
        </article>)}
      </div>
    </div>
  </section>;
}


function FaqSection({faqs}){return <div id="questions" className="ws-original-faq"><FaqStory items={faqs.map(({question,answer})=>[question,answer])} introduction="About bookings, your website, plans and getting started." contactHref="mailto:support.jovamedia@gmail.com" contactLabel="Ask the JovaMedia team" showArtwork={false}/></div>}

function ClosingSection(){return <section className="mp-closing"><div className="mp-closing-panel"><div><h2>Your next booking<br/>starts here.</h2><p>Set up your services, choose your working hours<br/>and give clients a simpler way to book.</p><TrialLink/></div><div className="mp-final-art"><div className="mp-final-name">JovaBook</div><div className="mp-final-slot"><span><Check/></span><div><b>You’re in the diary.</b><span>We’ll see you soon.</span></div></div></div></div></section>}
function CompactFooter(){return <footer className="mp-footer"><Link href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} sizes="110px"/></Link><span>Scheduling software by JovaMedia.</span><nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><CookieConsent/></nav><span>© {new Date().getFullYear()} JovaMedia</span></footer>}

export default function JovaBookLanding({faqs}){
  const film=useRef(null),video=useRef(null);
  function openVideo(){film.current?.showModal();}
  return <main className="ws" aria-labelledby="jovabook-title">
    <section className="ws-hero" data-website-intro><div className="ws-hero-inner"><div className="ws-hero-copy"><div className="ws-product-name">JovaBook</div><h1 id="jovabook-title">Booking system<br/>for service<br/>businesses.</h1><p>{"JovaBook is an appointment scheduling software by JovaMedia for salons, clinics, tutors and other service businesses. Take online bookings, manage your calendar and accept deposits from one workspace."}</p><div className="ws-hero-actions"><a className="button" href="#plans">Start your 3-day trial</a><a className="button ws-hero-login" href="https://book.jovamedia.com/login">Log in</a></div></div><div className="ws-hero-art"><div className="ws-disc"></div><figure className="ws-hero-calendar"><ProductImage name="calendar-desktop" alt="The JovaBook calendar with a full week of appointments" priority /></figure><figure className="ws-hero-phone"><ProductImage name="booking-mobile" alt="A client booking an appointment on their phone" priority /></figure><div className="ws-booked"><span className="ws-check">{"✓"}</span><div><b>{"Booked. In your diary."}</b><span>{"Your client chose the time."}</span></div></div></div></div></section>
<section className="ws-demo" id="demo"><div className="ws-demo-copy"><h2>{"Everything your business needs to take bookings and grow."}</h2><p>{"Explore online booking, your calendar and client records in this JovaBook demo."}</p><button className="ws-text-button" onClick={openVideo}>{"Watch the demo "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></button></div><button className="ws-film" aria-label="Play the JovaBook product demo" onClick={openVideo}><ProductImage name="demo-poster" alt="JovaBook product demo preview" /><span className="ws-play" aria-hidden="true"><span className="ws-play-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5Z"/></svg></span><span className="ws-play-copy">Play demo</span></span></button></section>
<section className="ws-calendar" id="calendar"><div className="ws-scene-heading"><h2>Your calendar, organised<br/>around your working day.</h2><p>See appointments and available time in day, week or month view, with colour-coded services and your team’s working hours. Open a booking to see the details, or add one straight into your diary.</p></div><div className="ws-calendar-stage"><figure><ProductImage name="calendar-desktop" alt="A full JovaBook weekly calendar, with colour-coded appointments" /></figure></div></section>
<BookingSection/>
<ToolsSection/>
<section className="ws-payments"><div className="ws-payments-inner"><div className="ws-payment-copy"><h2>Take booking deposits<br/>through Stripe.</h2><p>{"Choose a deposit percentage for your business. Clients pay through Stripe when they book, and the money goes to your connected account."}</p><a href="#questions" className="ws-light-link">{"About deposits and cancellations "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></a></div><div className="ws-payment-art"><div className="ws-payment-disc"></div><div className="ws-payment-receipt"><div className="ws-receipt-top"><span>{"Jova Studio"}</span><b>{"Booking deposit"}</b></div><p>{"Cut & finish"}</p><div className="ws-receipt-total">{"£10"}<span>{".00"}</span></div><span className="ws-payment-success">{"✓ Paid to your Stripe account"}</span><dl><div><dt>{"Appointment price"}</dt><dd>{"£50.00"}</dd></div><div><dt>{"20% deposit paid"}</dt><dd>{"£10.00"}</dd></div><div><dt>{"Remaining at your business"}</dt><dd>{"£40.00"}</dd></div></dl></div></div></div><div className="ws-reminder"><div className="ws-message"><div><span className="ws-message-icon">{"✉"}</span><b>{"Jova Studio"}</b><span>{"now"}</span></div><p>{"Reminder: next appt at 10:30am on Wednesday, 11 Nov. Jova Studio, 24 High Street."}</p></div><div><h3>{"Help clients remember"}<br />{"their appointment."}</h3><p>{"Email confirmations and reminders on every plan. Standard and Premium add one text reminder per appointment, sent 24 hours before or straight away for short-notice bookings."}</p></div></div></section>
<section className="ws-website" id="website"><div className="ws-website-copy"><h2>{"Your own website,"}<br />{"connected to your booking page."}</h2><p>{"Your business website and booking page, connected from the start. Give clients a feel for your business before they choose an appointment."}</p><div className="ws-website-detail"><h3>{"Make it your own."}</h3><p>{"Choose your image and colours, write your introduction and add your contact details from your dashboard."}</p></div><div className="ws-website-detail"><h3>{"Keep everything connected."}</h3><p>{"Your services, opening hours and booking link belong to the same business. Share one clear address with your clients."}</p></div><p className="ws-website-included">{"One-page website included with Essential and Standard. More pages with Premium."}</p><a className="button" href="#plans">{"Find your plan"}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg></a></div><div className="ws-site-frame"><div className="ws-site-address">{"jovastudio.jovamedia.com"}</div><ProductImage name="website" alt="The entire Jova Studio business website, without cropping" /></div></section>
<WorkspaceSection/>
<section className="ws-insights"><div className="ws-scene-heading"><h2>Understand your bookings<br/>and returning clients.</h2><p>See popular services, returning clients and people who are due another visit. Available on Standard and Premium.</p></div><figure><ProductImage name="insights" alt="JovaBook insights showing popular services and returning clients" /></figure></section>
<section className="section industry-section wrap ws-industries"><div className="section-head "><h2>{"Scheduling software"}<br />{"for service businesses."}</h2><p>{"Your services, your prices and the hours you work. Set up JovaBook around the appointments your clients book."}</p></div><div className="industry-grid"><article><ProductImage name="salon" alt="Hair & beauty" /><div><h3>{"Hair & beauty"}</h3><p>{"Hair salons, nails, barbers and beauty treatments"}</p></div></article><article><ProductImage name="industry-healthcare" alt="Healthcare" /><div><h3>{"Healthcare"}</h3><p>{"Dentists, chiropractors and therapists"}</p></div></article><article><ProductImage name="education-black-tutor" alt="Education & tutors" /><div><h3>{"Education & tutors"}</h3><p>{"Tuition centres and private lessons"}</p></div></article><article><ProductImage name="fitness" alt="Coaches & trainers" /><div><h3>{"Coaches & trainers"}</h3><p>{"Personal training and one-to-one sessions"}</p></div></article><article><ProductImage name="desk" alt="Consultation services" /><div><h3>{"Consultation services"}</h3><p>{"Consultants, advisers and appointments"}</p></div></article><article><ProductImage name="industry-spa" alt="Spa & wellness" /><div><h3>{"Spa & wellness"}</h3><p>{"Spas, facials and relaxation treatments"}</p></div></article></div></section>
<PricingSection/>
<FaqSection faqs={faqs}/>
<ClosingSection/>
<CompactFooter/>
    <dialog ref={film} className="movie-modal" aria-label="JovaBook product demo" onClose={()=>video.current?.pause()} onClick={e=>{if(e.target===e.currentTarget)film.current.close();}}><button className="modal-close" type="button" autoFocus onClick={()=>film.current.close()}>Close</button><video ref={video} controls playsInline preload="none" src="/jovabook/demo.mp4?v=clean-20261103" poster="/jovabook/demo-poster-clean.webp">Your browser does not support video. <a href="/jovabook/demo.mp4?v=clean-20261103">Watch the JovaBook demo</a>.</video></dialog>
  </main>;
}
