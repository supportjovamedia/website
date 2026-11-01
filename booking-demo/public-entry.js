/* Only anonymous public-home visits leave the booking app. Deep links stay here. */
(() => {
  'use strict';
  function destination(location, hasOwnerSession) {
    if (location.hostname !== 'book.jovamedia.com' || !['/', '/index.html'].includes(location.pathname) || hasOwnerSession) return null;
    if (!['', '#', '#home', '#plans'].includes(location.hash || '')) return null;
    const query = new URLSearchParams(location.search || '');
    // Unknown parameters can carry tenant, customer, signup or authentication context.
    if ([...query.keys()].some(key => !/^utm_(source|medium|campaign|term|content)$/.test(key) && !(key === 'portal' && query.getAll(key).length === 1 && query.get(key) === 'owner'))) return null;
    const url = new URL('https://www.jovamedia.com/jovabook');
    for (const [key, value] of query) if (key !== 'portal') url.searchParams.append(key, value);
    if (location.hash === '#plans') url.hash = 'plans';
    return url.href;
  }
  function ownerSession() {
    try {
      return sessionStorage.getItem('jovabook-owner') === '1' || !!localStorage.getItem('jovabook-auth');
    } catch { return true; } // A blocked storage read must not interrupt an owner session.
  }
  window.JovaPublicEntry = { destination };
  function redirectPublicHome() {
    const target = destination(window.location, ownerSession());
    if (target) window.location.replace(target);
  }
  redirectPublicHome();
  window.addEventListener?.('hashchange', redirectPublicHome);
})();
