import {OFFER_PLANS,offerSelection} from './jovabook-offer.mjs';

// Public display data derives prices, limits and commission from the approved
// subscription catalogue. This module does not change billing behaviour.
const labels={essential:{name:'Free',description:'For solo beginners, mobile technicians and side hustles.'},standard:{name:'Solo',description:'For established solo operators with a busy diary.'},premium:{name:'Team',description:'For multi-chair salons, clinics and growing studios.'}};
export const jovabookMarketingPlans=Object.entries(OFFER_PLANS).map(([id,plan])=>({
 id,...labels[id],monthly:plan.amount/100,annual:plan.annual/100,equivalent:plan.annual/1200,
 staffLabel:id==='premium'?'1 staff seat included':'1 staff calendar',websiteLabel:'One-page business website',recommended:id==='standard',commission:0
}));
export const jovabookCoreFeatures=['One-page business website','Online booking and calendar','Client records and services'];
export const jovabookUpgradeFeatures=[
 {label:'Stripe deposits',included:[false,true,true]},
 {label:'Embed bookings on your own website',included:[false,true,true]},
 {label:'SMS reminders',included:[false,true,true]},
 {label:'Extra staff seats',included:[false,false,true]},
 {label:'Advanced Insights and comparisons',included:[false,false,true]},
 {label:'Remove JovaMedia branding',included:[false,false,true]}
];
export const jovabookComparisonRows=[
 ["People taking bookings",jovabookMarketingPlans.map(plan=>plan.staffLabel)],
 ["Your business website",jovabookMarketingPlans.map(plan=>plan.websiteLabel)],
 ['Monthly bookings',['20','Unlimited','Unlimited']],
 ['Included emails per month',['50','100','100 per seat']],
 ['Included SMS per month',['0','60','60 per seat']],
 ...jovabookCoreFeatures.map(label=>[label,[true,true,true]]),
 ...jovabookUpgradeFeatures.filter(feature=>feature.label!=="Multi-page website").map(feature=>[feature.label,feature.included])
];
export function jovabookSignupHref(id,cadence='monthly',extraSeats=0){
 const selection=offerSelection(id,cadence,extraSeats);
 return `https://book.jovamedia.com/?portal=owner&plan=${id}&cadence=${selection.cadence}${extraSeats?`&seats=${selection.seats}`:''}#signup`;
}
