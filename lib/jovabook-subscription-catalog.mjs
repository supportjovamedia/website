/** Approved fixed GBP subscriptions. Provider identifiers are server configuration. */
export const SUBSCRIPTION_PLANS=Object.freeze({essential:{amount:2000,annual:19200,limit:1,commission_bps:100},standard:{amount:5000,annual:48000,limit:5,commission_bps:100},premium:{amount:10000,annual:96000,limit:10,commission_bps:0}});
export function validCadence(value){return value==='monthly'||value==='annual';}
export function subscriptionPrice(env,plan,cadence='monthly'){
 const row=SUBSCRIPTION_PLANS[plan];if(!row||!validCadence(cadence))throw Object.assign(Error('Choose a valid plan and monthly or annual billing.'),{status:400});
 return {...row,plan,cadence,amount:cadence==='annual'?row.annual:row.amount,interval:cadence==='annual'?'year':'month',id:env['JOVABOOK_STRIPE_PRICE_'+plan.toUpperCase()+(cadence==='annual'?'_ANNUAL':'')]};
}
export function catalogConfigured(env){const ids=Object.keys(SUBSCRIPTION_PLANS).flatMap(plan=>['monthly','annual'].map(cadence=>subscriptionPrice(env,plan,cadence).id));return ids.every(id=>/^price_[A-Za-z0-9]+$/.test(id||''))&&new Set(ids).size===6;}
export function monthlyCatalogConfigured(env){const ids=Object.keys(SUBSCRIPTION_PLANS).map(plan=>subscriptionPrice(env,plan).id);return ids.every(id=>/^price_[A-Za-z0-9]+$/.test(id||''))&&new Set(ids).size===3;}
export function subscriptionForPrice(env,id){for(const plan of Object.keys(SUBSCRIPTION_PLANS))for(const cadence of ['monthly','annual']){const row=subscriptionPrice(env,plan,cadence);if(row.id&&row.id===id)return row;}return null;}
export function validateSubscriptionPrice(value,approved,mode){if(value?.id!==approved.id||!value.active||value.livemode!==(mode==='live')||value.currency!=='gbp'||value.unit_amount!==approved.amount||value.recurring?.interval!==approved.interval||value.recurring.interval_count!==1)throw Error('Unapproved subscription price.');return value;}

/** Monthly commission anniversaries use the verified Stripe UTC anchor, not 30 days. */
export function commissionMonthWindow(anchor,at){
 if(!Number.isSafeInteger(anchor)||!Number.isSafeInteger(at)||at<anchor)throw Error('Invalid verified commission anniversary.');
 const a=new Date(anchor*1000),d=new Date(at*1000);if(!Number.isFinite(+a)||!Number.isFinite(+d))throw Error('Invalid verified commission anniversary.');
 const boundary=offset=>{const month=a.getUTCMonth()+offset,year=a.getUTCFullYear()+Math.floor(month/12),m=((month%12)+12)%12,last=new Date(Date.UTC(year,m+1,0)).getUTCDate();return Date.UTC(year,m,Math.min(a.getUTCDate(),last),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds())/1000;};
 let index=(d.getUTCFullYear()-a.getUTCFullYear())*12+d.getUTCMonth()-a.getUTCMonth();if(boundary(index)>at)index--;
 return {start:boundary(index),end:boundary(index+1),index,boundary};
}
