/* The app root is business login. Only legacy pricing links leave the app. */
(() => {
  'use strict';
  function destination(location) {
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
