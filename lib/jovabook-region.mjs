// JovaBook business sign-ups are open to the UK, USA, Canada and Australia. The country comes from Vercel's edge
// (x-vercel-ip-country). A missing header (local development) is allowed.
import {currencyForCountry} from './jovabook-currency.mjs';
const ALLOWED=new Set(['GB','IM','JE','GG','US','CA','AU']);
const ORIGIN=/^https:\/\/(?:[a-z0-9-]+\.)*jovamedia\.com$|^https?:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$/;
export const REGION_MESSAGE='JovaBook is currently open to businesses in the United Kingdom, the USA, Canada and Australia. We will open sign-ups in more countries soon.';
export function regionDecision(headers){
 const country=String(headers.get('x-vercel-ip-country')||'').toUpperCase();
 return {country:country||null,allowed:!country||ALLOWED.has(country),currency:currencyForCountry(country)};
}
function cors(request){
 const origin=request.headers.get('origin')||'';
 return {'Cache-Control':'no-store','Vary':'Origin',...(ORIGIN.test(origin)?{'Access-Control-Allow-Origin':origin}:{})};
}
export function regionEndpoint(){
 return {
  GET:request=>{const d=regionDecision(request.headers);return Response.json({allowed:d.allowed,currency:d.currency,message:d.allowed?null:REGION_MESSAGE},{headers:cors(request)});},
  OPTIONS:request=>new Response(null,{status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'GET','Access-Control-Max-Age':'86400'}})
 };
}
