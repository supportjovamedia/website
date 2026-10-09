import {createHmac,timingSafeEqual} from 'node:crypto';

export function signReceipt(bookingId,businessId,secret,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({bookingId,businessId,expires:now+86400000})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}

export function readReceipt(value,businessId,secret,now=Date.now()){
 try{
  if(typeof value!=='string'||value.length>1024)return null;
  const parts=value.split('.');if(parts.length!==2)return null;
  const expected=createHmac('sha256',secret).update(parts[0]).digest();
  const signature=Buffer.from(parts[1],'base64url');
  if(signature.length!==expected.length||!timingSafeEqual(signature,expected))return null;
  const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  if(payload.businessId!==businessId||!Number.isSafeInteger(payload.bookingId)||payload.bookingId<1||payload.expires<=now)return null;
  return payload;
 }catch{return null;}
}
