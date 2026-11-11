import {businessSlug,publicSiteSlug} from './jovabook-public-address.mjs';
export function createBookingEmbed({env=process.env,send=fetch,readShell,standalone=false,canonical=false}={}){
 return async function GET(request,{params}){
  const {slug}=await params;
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"frame-ancestors 'none'"};
  const denied=(status,message)=>new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Booking calendar</title><body><p>${message}</p></body></html>`,{status,headers});
  if(!(canonical?publicSiteSlug:businessSlug)(slug))return denied(404,'This booking link is unavailable.');
  if(!env.JOVABOOK_SUPABASE_URL||!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY)return denied(503,'Booking is temporarily unavailable.');
  try{
   const base=new URL(env.JOVABOOK_SUPABASE_URL);if(base.protocol!=='https:')throw Error('Invalid booking server.');
   const response=await send(new URL('/rest/v1/rpc/public_salon',base).href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_slug:slug}),signal:AbortSignal.timeout(10000),cache:'no-store'});
   if(!response.ok)throw Error('Unavailable booking server.');const business=await response.json();
   if(business?.slug!==slug)return denied(404,'This booking link is unavailable.');
   if(!standalone&&(business.offer_version!=='2026-11-free-v1'||business.embed_allowed!==true))return denied(403,'Open the booking link shared by this business.');
   let shell=await readShell();
   shell=shell.replace(/\b(src|href)="\/(?!\/)/g,'$1="https://book.jovamedia.com/');
   if (canonical) {
    shell=shell.replace(/https:\/\/book\.jovamedia\.com\/assets\/(owner-(?:entry|app|styles)\.[a-f0-9]{20}\.(?:js|css))/g,'/api/jovabook/assets/$1');
   }
   if (!canonical) shell=shell.replace('</head>',`<script>window.JOVA_EMBED_SLUG=${JSON.stringify(slug)};window.JOVA_STANDALONE_BOOKING=${standalone};</script></head>`);
   if (!standalone) headers['Content-Security-Policy']='frame-ancestors https: http://localhost:* http://127.0.0.1:*';
   const url = new URL(request.url);
   if (canonical && (url.pathname === '/book/'+slug+'/appointments' || url.searchParams.get('view') === 'booking')) {
    headers['Content-Security-Policy']="frame-ancestors 'self' https://*.jovamedia.com";
   }
   return new Response(shell,{status:200,headers});
  }catch{return denied(503,'Booking is temporarily unavailable.');}
 };
}
