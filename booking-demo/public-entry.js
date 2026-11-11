/* The app root is business login. Only legacy pricing links leave the app. */
(() => {
  'use strict';
  function legacyDestination(location, links) {
    if (!links || (location.hostname !== 'book.jovamedia.com' && !links.hostBusiness(location))) return null;
    const address = links.resolve(location);
    const query = new URLSearchParams(location.search || '');
    const hash = String(location.hash || '').slice(1);
    if (!address.slug || address.demo || query.get('portal') === 'owner') return null;

    // Stripe returns already in flight must keep access to the original tab's verifier.
    if (hash === 'book/deposit' || hash === 'customer/reset') return null;
    let route = /^(book|website|customer|manage)(\/|$)/.test(hash) ? hash : address.route;
    if (['login','register','forgot','reset'].includes(hash)) route = 'customer/' + hash;
    if (['home','plans','signup','setup','checkout','billing','dashboard'].includes(hash) && !links.hostBusiness(location)) return null;
    const authCallback = /^(?:access_token|error|error_code|type)=/.test(hash);
    if (authCallback) {
      if (query.get('portal') !== 'customer' && !address.route.startsWith('customer/')) return null;
      route = 'customer/login';
    }

    let target;
    if (route.startsWith('customer/')) {
      // A card setup started on the old customer portal still returns to that session.
      if ((!hash && route === 'customer/bookings') || hash === 'customer/payments') {
        try {
          if (window.sessionStorage?.getItem('jovabook-customer-auth-v1:' + address.slug)) return null;
        } catch {}
      }
      target = links.account(address.slug, {page: route.slice(9), location});
    } else if (route.startsWith('book/')) {
      target = links.booking(address.slug, {step: route.slice(5), location});
    } else if (route.startsWith('manage/')) {
      target = links.booking(address.slug, {location});
    } else if (route.startsWith('website')) {
      target = links.website(address.slug, {page: route.split('/')[1] || 'home', location});
    }
    if (!target) return null;

    const url = new URL(target);
    if (url.hostname !== 'www.jovamedia.com') return null;
    for (const [key, value] of query) {
      if (key === 'service' || /^utm_(source|medium|campaign|term|content)$/.test(key)) url.searchParams.append(key, value);
    }
    if (authCallback || route.startsWith('manage/')) url.hash = hash;
    return url.href;
  }
  function destination(location) {
    const target = legacyDestination(location, window.JovaPublicLinks);
    if (target) return target;
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
    if (window.top && window.top !== window) return;
    const target = destination(window.location);
    if (target) window.location.replace(target);
  }
  redirectPublicHome();
  window.addEventListener?.('hashchange', redirectPublicHome);
})();
