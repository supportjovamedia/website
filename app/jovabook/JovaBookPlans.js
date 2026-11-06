"use client";
import {useEffect,useId,useState} from 'react';
import {localPrice,currencyLabel,isCurrency} from '@/lib/jovabook-currency.mjs';
import {jovabookMarketingPlans,jovabookSignupHref} from '@/lib/jovabook-marketing-plans.mjs';
import {offerSelection} from '@/lib/jovabook-offer.mjs';
import s from './plans.module.css';

const pounds=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(value/100).replace('.00','');
export default function JovaBookPlans(){
 const [currency,setCurrency]=useState('GBP');
 useEffect(()=>{let live=true;fetch('/api/jovabook/region',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d&&isCurrency(d.currency))setCurrency(d.currency);}).catch(()=>{});return()=>{live=false;};},[]);
 const local=currency!=='GBP',price=pounds=>localPrice(pounds,currency),gbp=pounds=>localPrice(pounds,'GBP');
 const [cadence,setCadence]=useState('monthly'),[extraSeats,setExtraSeats]=useState(0),[seatText,setSeatText]=useState('0'),seatId=useId();
 const annual=cadence==='annual';
 return <div id="essential-plan" className={s.pricing}>
  <div className={s.cadence} role="group" aria-label="Billing frequency">
   <button type="button" aria-pressed={!annual} onClick={()=>setCadence('monthly')}>Monthly</button>
   <button type="button" aria-pressed={annual} onClick={()=>setCadence('annual')}>Yearly <span>Save 20%</span></button>
  </div>
  <div className={s.grid} role="region" aria-label="JovaBook plans">
   {jovabookMarketingPlans.map(plan=>{
    const free=plan.id==='essential',team=plan.id==='premium',selection=offerSelection(plan.id,cadence,team?extraSeats:0);
    const features=[team?`${selection.seats} staff ${selection.seats===1?'seat':'seats'}`:'1 staff calendar',free?'20 bookings per month':'Unlimited monthly bookings','One-page business website','Online booking and client records',...(!free?['Stripe deposits']:[]),`${selection.emails} emails per month`,free?'Email alerts only':`${selection.sms} SMS per month`,...(!free?['Embed bookings on your own website']:[]),...(team?['Clients choose their team member','Advanced Insights and comparisons','Extra website customisation','JovaMedia branding removed']:['Powered by JovaMedia badge'])];
    return <article key={plan.id} className={`${s.card} ${plan.recommended?s.recommended:''}`} aria-label={`${plan.name} plan`}>
     {plan.recommended&&<span className={s.recommendation}>For a busy solo diary</span>}
     <h3>{plan.name}</h3><p className={s.description}>{plan.description}</p>
     <div className={s.price} aria-live="polite" aria-atomic="true"><strong>{local&&selection.monthlyEquivalent>0&&<span aria-hidden="true" style={{fontSize:".5em",marginRight:4}}>≈</span>}{local?price(selection.monthlyEquivalent/100):pounds(selection.monthlyEquivalent)}</strong><span>/ month</span></div>
     <p className={s.billing}>{free?'Free to use. No card required.':`Card required. ${annual?`${pounds(team?24000:selection.total)} billed yearly`:`${pounds(team?2500:selection.total)} billed monthly`}${local?` (about ${price((team?(annual?24000:2500):selection.total)/100)} ${currencyLabel(currency)})`:''}, starting today and renewing automatically.${local?' Charged in GBP; your bank converts at its own rate.':''}`}</p>
     <p className={s.commission}>0% booking commission</p>
     <a className={plan.recommended?s.primary:s.button} href={jovabookSignupHref(plan.id,cadence,0)}>{free?'Start free today':`Choose ${plan.name}`}</a>
     <ul aria-label={`${plan.name} features`}>{features.map(feature=><li key={feature}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg><span>{feature}</span></li>)}</ul>
     {team?<div className={s.seats}><label htmlFor={seatId}>Extra staff seats on the paid plan</label><input id={seatId} type="number" min="0" max="999" step="1" inputMode="numeric" value={seatText} onChange={e=>{const raw=e.target.value.replace(/\D/g,'').slice(0,3);const value=raw===''?0:Number(raw);setSeatText(raw===''?'':String(value));setExtraSeats(value);}} onBlur={()=>setSeatText(String(extraSeats))}/><p>{annual?`£240/year${local?` (about ${price(240)})`:''} includes one seat and one calendar. Each extra seat is £57.60/year${local?` (about ${price(57.6)})`:''}.`:`£25/month${local?` (about ${price(25)})`:''} includes one seat and one calendar. Each extra seat is £6/month${local?` (about ${price(6)})`:''}, added after payment.`}</p></div>:<div className={s.seats} aria-hidden="true"/>}
    </article>;
   })}
  </div>
  <div className={s.notes}><p>JovaBook is currently open to businesses in the United Kingdom, the USA, Canada and Australia.</p><p>Stripe deposits are included on paid plans. Stripe payment-processing fees are separate.</p><p>Monthly email and SMS allowances reset each calendar month and do not roll over. Messages pause when the allowance is used; extra messages are never charged automatically.</p></div>
 </div>;
}
