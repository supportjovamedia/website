import {after} from 'next/server';
import {createRedirectHandler} from '@/lib/short-links.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=5;
const go=createRedirectHandler({schedule:after});
export async function GET(request,{params}){return go(request,String((await params).code||'').toLowerCase());}
