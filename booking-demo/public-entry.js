/* The app root is business login. Only legacy pricing links leave the app. */
(() => {
  'use strict';
  function destination(location) {
    if(location.hostname==='book.jovamedia.com'&&window.JovaPublicLinks){const address=window.JovaPublicLinks.resolve(location),query=new URLSearchParams(location.search||''),hash=String(location.hash||'').slice(1);if(address.slug&&!address.demo&&query.get('portal')!=='owner'&&!['home','plans','signup','setup','checkout','billing','dashboard'].includes(hash)){let route=/^(book|website|customer|manage)(\/|$)/.test(hash)?hash:address.route;if((hash.startsWith('access_token=')||hash.startsWith('error=')||hash.startsWith('type='))&&(query.get('portal')==='customer'||address.route.startsWith('customer/')))route='customer/login';if(['login','register','forgot','reset'].includes(hash))route='customer/'+hash;let target=route.startsWith('customer/')?window.JovaPublicLinks.account(address.slug,{page:route.slice(9)}):route.startsWith('book/')?window.JovaPublicLinks.booking(address.slug,{step:route.slice(5)}):route.startsWith('website')?window.JovaPublicLinks.website(address.slug,{page:route.split('/')[1]||'home'}):null;if(target){const url=new URL(target);if(hash&&(hash.startsWith('access_token=')||hash.startsWith('error=')||hash.startsWith('type=')||route.startsWith('manage/')))url.hash=hash;return url.href;}}}
    if (location.hostname !== 'book.jovamedia.com' || !['/', '/index.html'].includes(location.pathname)) return null;
    if (location.hash !== '#plans') return null;
    const query = new URLSearchParams(location.search || '');
    // Unknown parameters can carry tenant, customer, signup or authentication context.
    if ([...query.keys()].some(key => !/^utm_(source|medium|campaign|term|content)$/.test(key) && !(key === 'portal' && query.getAll(key).length === 1 && query.get(key) === 'owner'))) return null;
    const url = new URL('https://www.jovamedia.com/jovabook');
    for (const [key, value] of query) if (key !== 'portal') url.searchParams.append(key, value);
    if (location.hash === '#plans') url.hash = 'plans';
    return url.href;
  }
  window.JovaPublicEntry = { destination };
  function redirectPublicHome() {
    const target = destination(window.location);
    if (target) window.location.replace(target);
  }
  redirectPublicHome();
  window.addEventListener?.('hashchange', redirectPublicHome);
})();
