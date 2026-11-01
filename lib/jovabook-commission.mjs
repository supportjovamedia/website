// Monthly SaaS commission on the full booking service price. This is never a
// Connect application fee or a deduction from a customer's deposit payment.
// Snapshot the result in the commission ledger, separate from customer payments.
export const JOVABOOK_COMMISSION_BPS=Object.freeze({essential:100,standard:100,premium:0});
export function jovaBookCommission(plan,servicePriceMinor){
 if(!Object.hasOwn(JOVABOOK_COMMISSION_BPS,plan))throw new TypeError('A verified JovaBook plan is required.');
 if(!Number.isSafeInteger(servicePriceMinor)||servicePriceMinor<0||servicePriceMinor>99999999)throw new RangeError('Invalid booking service price.');
 const basisPoints=JOVABOOK_COMMISSION_BPS[plan];
 const amount=Number((BigInt(servicePriceMinor)*BigInt(basisPoints)+5000n)/10000n);
 return Object.freeze({plan,basisPoints,servicePriceMinor,amount,currency:'gbp'});
}
