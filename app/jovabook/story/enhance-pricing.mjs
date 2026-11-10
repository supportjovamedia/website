import {offerSelection} from '../../../lib/jovabook-offer.mjs';
import {jovabookSignupHref} from '../../../lib/jovabook-marketing-plans.mjs';

const money=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(pence/100).replace(/\.00$/,'');

// The pricing page and homepage use the same controls without network requests.
export function enhancePricing(root,{onPlanSelect,onSeatsChange}={}){
 let pricing=root.querySelector('#ex-pricing');
 if(!pricing)return ()=>{};
 const q=id=>pricing.querySelector('#'+id);
 let cadence='monthly',seats=1;
 const note=pricing.querySelector('.js-pricing-note');
 if(note&&!note.closest('details')){
  const details=document.createElement('details'),summary=document.createElement('summary');
  details.className='nr-price-details';summary.textContent='Plan & payment details';
  details.append(summary,note);pricing.querySelector('.js-plan-grid').after(details);
 }
 const annualButton=pricing.querySelector('[data-cadence="annual"]');
 if(!annualButton.querySelector('.sw-yearly-badge')){
  annualButton.textContent='Yearly';const wrap=document.createElement('span'),tag=document.createElement('span');wrap.className='sw-yearly-badge';tag.className='sw-yearly-saving';tag.textContent='Save 20%';wrap.append(tag);annualButton.append(wrap);
 }
 const readSeats=()=>Math.max(1,Math.min(100,Math.trunc(Number(q('nv-team-count').value)||1)));
 const update=()=>{
  pricing=root.querySelector('#ex-pricing');
  const solo=offerSelection('standard',cadence),team=offerSelection('premium',cadence,seats-1),annual=cadence==='annual';
  q('ex-solo-price').textContent=money(solo.monthlyEquivalent);
  q('ex-team-price').textContent=money(team.monthlyEquivalent);
  q('ex-solo-billing').textContent=annual?`${money(solo.total)} billed yearly, paid upfront.`:'Billed monthly.';
  q('ex-team-billing').textContent=annual?`${money(team.total)} billed yearly for ${seats} ${seats===1?'seat.':'seats.'}`:seats===1?'One seat included. Extra seats £6/month.':`Billed monthly for ${seats} seats.`;
  q('nv-team-count').value=seats;q('nv-team-minus').disabled=seats===1;q('nv-team-plus').disabled=seats===100;
  pricing.querySelectorAll('[data-cadence]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cadence===cadence)));
  const ids={Free:'essential',Solo:'standard',Team:'premium'};
  pricing.querySelectorAll('a[data-plan]').forEach(link=>{link.href=jovabookSignupHref(ids[link.dataset.plan],cadence,link.dataset.plan==='Team'?seats-1:0);});
 };
 const syncSeats=()=>{update();onSeatsChange?.(seats);};
 const click=event=>{
  pricing=root.querySelector('#ex-pricing');
  const button=event.target.closest('[data-cadence],#nv-team-minus,#nv-team-plus,[data-plan]');
  if(!button||!pricing.contains(button))return;
  seats=readSeats();
  if(button.dataset.cadence){cadence=button.dataset.cadence;update();}
  else if(button.id==='nv-team-minus'){seats=Math.max(1,seats-1);syncSeats();}
  else if(button.id==='nv-team-plus'){seats=Math.min(100,seats+1);syncSeats();}
  else if(button.dataset.plan){if(button.dataset.plan==='Team')syncSeats();onPlanSelect?.(button.dataset.plan);}
 };
 const input=event=>{if(event.target.id!=='nv-team-count')return;const value=Number(event.target.value);if(Number.isInteger(value)&&value>=1&&value<=100){seats=value;syncSeats();}};
 const blur=event=>{if(event.target.id==='nv-team-count')update();};
 root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('focusout',blur);update();
 return ()=>{root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('focusout',blur);};
}
