/** Public offer. Existing internal plan keys keep account history intact. */
export const OFFER_VERSION='2026-11-free-v1';
export const PAID_TRIAL_DAYS=14;
export const OFFER_PLANS=Object.freeze({
 essential:Object.freeze({name:'Starter',amount:0,annual:0,limit:1,bookings:20,emails:50,sms:0,branding:true,embed:false,insights:false}),
 standard:Object.freeze({name:'Pro Solo',amount:2000,annual:19200,limit:1,bookings:null,emails:100,sms:60,branding:true,embed:true,insights:false}),
 premium:Object.freeze({name:'Pro Team',amount:2500,annual:24000,limit:1,bookings:null,emails:100,sms:60,branding:false,embed:true,insights:true})
});
export const TEAM_SEAT={amount:600,annual:5760,emails:100,sms:60};
export function offerSelection(plan,cadence='monthly',extraSeats=0){
 if(!Object.hasOwn(OFFER_PLANS,plan)||!['monthly','annual'].includes(cadence)||!Number.isSafeInteger(extraSeats)||extraSeats<0||extraSeats>999||(plan!=='premium'&&extraSeats!==0))throw Object.assign(Error('Choose a valid plan, billing frequency and number of extra staff seats.'),{status:400});
 const row=OFFER_PLANS[plan],seats=1+extraSeats;
 return {...row,plan,cadence:plan==='essential'?'monthly':cadence,extraSeats,seats,
  total:(cadence==='annual'?row.annual:row.amount)+extraSeats*(cadence==='annual'?TEAM_SEAT.annual:TEAM_SEAT.amount),
  monthlyEquivalent:row.amount*(cadence==='annual'?.8:1)+extraSeats*TEAM_SEAT.amount*(cadence==='annual'?.8:1),
  emails:row.emails*seats,sms:row.sms*seats,commission_bps:0};
}
