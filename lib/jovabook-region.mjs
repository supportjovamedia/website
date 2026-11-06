// Business signup eligibility uses Vercel's IP-country hint. This is not proof
// of residency and is not an Auth security boundary. Missing country is allowed
// only in local development, not in the hosted signup preflight.
import {currencyForCountry} from './jovabook-currency.mjs';
const ALLOWED=new Set(['GB','IM','JE','GG','US','CA','AU']);
const ORIGIN=/^https:\/\/(?:[a-z0-9-]+\.)*jovamedia\.com$|^https?:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$/;
export const REGION_MESSAGE='JovaBook is currently open to businesses in the United Kingdom, the USA, Canada and Australia. We will open sign-ups in more countries soon.';
export function regionDecision(headers,{requireCountry=false}={}){
 const country=String(headers.get('x-vercel-ip-country')||'').toUpperCase();
 return {country:country||null,allowed:country?ALLOWED.has(country):!requireCountry,currency:currencyForCountry(country)};
}
function cors(request){
 const origin=request.headers.get('origin')||'';
 return {'Cache-Control':'no-store','Vary':'Origin',...(ORIGIN.test(origin)?{'Access-Control-Allow-Origin':origin}:{})};
}
export function regionEndpoint({requireCountry=process.env.VERCEL==='1'}={}){
 return {
  GET:request=>{const d=regionDecision(request.headers,{requireCountry});return Response.json({allowed:d.allowed,currency:d.currency,message:d.allowed?null:d.country?REGION_MESSAGE:'We could not verify signup availability for your location. Please try again.'},{headers:cors(request)});},
  OPTIONS:request=>new Response(null,{status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'GET','Access-Control-Max-Age':'86400'}})
 };
}
