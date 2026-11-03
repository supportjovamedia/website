import {createRedirectHandler} from '@/lib/short-links.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const go=createRedirectHandler();
export async function GET(request,{params}){return go(request,String((await params).code||'').toLowerCase());}
