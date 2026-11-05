import {OFFER_PLANS,offerSelection,TEAM_SEAT} from './jovabook-offer.mjs';
const names={standard:'PRO_SOLO',premium:'TEAM'};
export function offerPrice(env,plan,cadence='monthly'){
 const chosen=offerSelection(plan,cadence);
 if(plan==='essential')throw Object.assign(Error('Starter is free and does not use Stripe Checkout.'),{status:400});
 return {...chosen,id:env['JOVABOOK_STRIPE_PRICE_'+names[plan]+(cadence==='annual'?'_ANNUAL':'')],interval:cadence==='annual'?'year':'month',amount:cadence==='annual'?OFFER_PLANS[plan].annual:OFFER_PLANS[plan].amount};
}
export function offerPriceForId(env,id){for(const plan of Object.keys(names))for(const cadence of ['monthly','annual']){const value=offerPrice(env,plan,cadence);if(value.id&&value.id===id)return value;}return null;}
export function offerCatalogConfigured(env){const ids=Object.keys(names).flatMap(plan=>['monthly','annual'].map(cadence=>offerPrice(env,plan,cadence).id));return ids.every(id=>/^price_[A-Za-z0-9]+$/.test(id||''))&&new Set(ids).size===4;}
export function validateOfferPrice(value,approved,mode){
 if(value?.id!==approved.id||!value.active||value.livemode!==(mode==='live')||value.currency!=='gbp'||value.recurring?.interval!==approved.interval||value.recurring.interval_count!==1||value.recurring.usage_type!=='licensed'||value.transform_quantity)throw Error('Unapproved subscription price.');
 if(approved.plan==='standard'){if(value.billing_scheme!=='per_unit'||value.unit_amount!==approved.amount)throw Error('Unapproved Pro Solo price.');}
 else{
  const tiers=value.tiers;
  if(value.billing_scheme!=='tiered'||value.tiers_mode!=='graduated'||tiers?.length!==2||tiers[0].up_to!==1||tiers[0].flat_amount!==approved.amount||(tiers[0].unit_amount??0)!==0||tiers[1].up_to!==null||(tiers[1].flat_amount??0)!==0||tiers[1].unit_amount!==(approved.cadence==='annual'?TEAM_SEAT.annual:TEAM_SEAT.amount))throw Error('Unapproved Team base or seat price.');
 }
 return value;
}
