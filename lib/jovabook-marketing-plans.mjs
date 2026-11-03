import {SUBSCRIPTION_PLANS} from "./jovabook-subscription-catalog.mjs";

// Public display data derives prices, limits and commission from the approved
// subscription catalogue. This module does not change billing behaviour.
const labels={essential:{name:"Essential",description:"For your own diary."},standard:{name:"Standard",description:"For your team’s working day."},premium:{name:"Premium",description:"More room, more control."}};
export const jovabookMarketingPlans=Object.entries(SUBSCRIPTION_PLANS).map(([id,plan])=>({
 id,...labels[id],monthly:plan.amount/100,annual:plan.annual/100,equivalent:plan.annual/1200,commission:plan.commission_bps/100,
 staffLabel:id==="essential"?"1 owner":`Up to ${plan.limit} staff`,websiteLabel:id==="premium"?"Multi-page business website":"One-page business website",recommended:id==="standard"
}));
export const jovabookCoreFeatures=["Online booking and calendar","Client records and services","Email confirmations and reminders","Website personalisation"];
export const jovabookUpgradeFeatures=[
 {label:"Text reminders",included:[false,true,true]},
 {label:"Slot recovery",included:[false,true,true]},
 {label:"Individual staff hours",included:[false,true,true]},
 {label:"Business Insights",included:[false,true,true]},
 {label:"Multi-page website",included:[false,false,true]},
 {label:"Insights period comparisons",included:[false,false,true]},
 {label:"Remove JovaMedia branding",included:[false,false,true]}
];
export const jovabookComparisonRows=[
 ["People taking bookings",jovabookMarketingPlans.map(plan=>plan.staffLabel)],
 ["Your business website",jovabookMarketingPlans.map(plan=>plan.websiteLabel)],
 ...jovabookCoreFeatures.map(label=>[label,[true,true,true]]),
 ...jovabookUpgradeFeatures.filter(feature=>feature.label!=="Multi-page website").map(feature=>[feature.label,feature.included])
];
export function jovabookSignupHref(id,cadence="monthly"){
 if(!Object.hasOwn(SUBSCRIPTION_PLANS,id)||!["monthly","annual"].includes(cadence))throw Error("Unknown JovaBook plan selection");
 return `https://book.jovamedia.com/?portal=owner&plan=${id}&cadence=${cadence}#signup`;
}
