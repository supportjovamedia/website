export const BUSINESS_RESERVED = Object.freeze(['www','app','admin','support','salon','api','bookings','book','mail','help','billing','status','blog','login','signup','dashboard','jova','jovamedia','jovabook','staging','test','demo','owner','operator','customer','auth','callback','recovery','reset','forgot','register','index','assets','fonts','images','scripts','styles','config','health','robots','favicon','sitemap']);
export const publicSiteSlug = value => typeof value==='string'&&value.length>=3&&value.length<=30&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value!=='jova-demo';
export const businessSlug = value => publicSiteSlug(value)&&!BUSINESS_RESERVED.includes(value);
export const CUSTOMER_WEBSITE_ORIGIN = 'https://www.jovamedia.com';
export const customerWebsiteUrl = slug => CUSTOMER_WEBSITE_ORIGIN + '/book/' + slug;
export const customerBookingUrl = slug => customerWebsiteUrl(slug) + '/appointments';
export const customerAccountUrl = slug => customerWebsiteUrl(slug) + '?view=account';
export function businessOrigin(slug){return businessSlug(slug)?'https://'+slug+'.jovamedia.com':null;}
export function originBusiness(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.port||u.username||u.password||u.origin!==value)return null;const match=/^([a-z0-9-]+)\.jovamedia\.com$/.exec(u.hostname);return match&&businessSlug(match[1])?match[1]:null;}catch{return null;}}
export const customerOriginAllowed=value=>['https://book.jovamedia.com','https://jovamedia.com','https://www.jovamedia.com'].includes(value)||originBusiness(value)!==null;
export function businessHostRewrites(){
 const host={type:'host',value:'(?<business>(?!(?:'+[...BUSINESS_RESERVED,'jova-demo'].join('|')+')\\.)(?=[a-z0-9-]{3,30}\\.jovamedia\\.com$)[a-z0-9]+(?:-[a-z0-9]+)*)\\.jovamedia\\.com'};
 const rule=(source,destination)=>({source,has:[host],destination});
 return [
  rule('/api/jovabook/:path*','https://www.jovamedia.com/api/jovabook/:path*'),
  rule('/:file([^/]+\\.(?:js|css|ico|svg|png|jpg|jpeg|webp|woff2|txt))','https://book.jovamedia.com/:file'),
  ...['brand','fonts','images','assets'].map(dir=>rule('/'+dir+'/:path*','https://book.jovamedia.com/'+dir+'/:path*')),
  rule('/login','https://book.jovamedia.com/:business/account/login'),
  rule('/register','https://book.jovamedia.com/:business/account/register'),
  rule('/','https://book.jovamedia.com/:business'),
  rule('/:path*','https://book.jovamedia.com/:business/:path*')
 ];
}
