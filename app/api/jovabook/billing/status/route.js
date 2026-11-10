import {after} from 'next/server';
import {createJovaBookBillingHandlers} from '@/lib/jovabook-billing.mjs';
export const runtime='nodejs';
const status=createJovaBookBillingHandlers({observe:callback=>after(callback),accessLog:record=>console.info('jovabook_access_status',JSON.stringify(record))}).status;
const bookingOrigin='https://book.jovamedia.com';
function cors(request,response){
 response.headers.append('Vary','Origin');
 if(request.headers.get('origin')===bookingOrigin)response.headers.set('Access-Control-Allow-Origin',bookingOrigin);
 return response;
}
export async function POST(request){return cors(request,await status(request));}
export function OPTIONS(request){
 const response=cors(request,new Response(null,{status:204,headers:{'Cache-Control':'no-store'}}));
 if(request.headers.get('origin')===bookingOrigin){
  response.headers.set('Access-Control-Allow-Methods','POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, x-jovabook-access-reason, x-jovabook-client');
  response.headers.set('Access-Control-Max-Age','86400');
 }
 return response;
}
