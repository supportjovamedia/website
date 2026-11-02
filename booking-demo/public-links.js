/* Public address parsing only. The backend still checks the exact requested slug. */
(() => {
  'use strict';
  const demoSlug = 'jova-demo';
  const reserved = new Set(['www','app','admin','support','salon','api','bookings','book','mail','help','billing','status','blog','login','signup','dashboard','jova','jovamedia','jovabook','staging','test','demo','owner','operator','customer','auth','callback','recovery','reset','forgot','register','index','assets','fonts','images','scripts','styles','config','health','robots','favicon','sitemap']);
  const validSlug = value => typeof value === 'string' && value.length >= 3 && value.length <= 30 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const cleanSlug = value => validSlug(value) && value !== demoSlug && !reserved.has(value);
  function resolve(location = window.location) {
    const empty = {slug: '', demo: false};
    if (!location || typeof location.pathname !== 'string') return empty;
    const pathname = location.pathname, query = new URLSearchParams(location.search || '');
    if (query.getAll('salon').length > 1 || query.getAll('demo').length > 1) return empty;
    const salon = query.get('salon'), demo = query.get('demo');
    const home = pathname === '/' || pathname === '/index.html';
    const candidate = /^\/[a-z0-9-]+$/.test(pathname) ? pathname.slice(1) : '';
    if (!home && !cleanSlug(candidate)) return empty;
    if (demo !== null && demo !== demoSlug) return empty;
    if (demo === demoSlug || salon === demoSlug) return {slug: '', demo: true};
    if (salon !== null && (!validSlug(salon) || (!home && salon !== candidate))) return empty;
    return {slug: salon || (cleanSlug(candidate) ? candidate : ''), demo: false};
  }
  function build(slug, hash, {demo = false, location = window.location} = {}) {
    if (!validSlug(slug) || (!demo && slug === demoSlug) || (demo && slug !== demoSlug)) return '';
    let origin;
    try { const url = new URL(location.origin || location.href); if (!['http:', 'https:'].includes(url.protocol)) return ''; origin = url.origin; } catch { return ''; }
    const url = new URL(origin + '/');
    if (demo) url.searchParams.set('demo', demoSlug);
    else if (cleanSlug(slug)) url.pathname = '/' + slug;
    else url.searchParams.set('salon', slug); // Keep legacy businesses with reserved names reachable.
    url.hash = hash;
    return url.href;
  }
  window.JovaPublicLinks = Object.freeze({resolve, validSlug, booking:(slug, options)=>build(slug, 'book/service', options), website:(slug, {page = 'home', ...options} = {})=>['home','about','contact'].includes(page) ? build(slug, 'website' + (page === 'home' ? '' : '/' + page), options) : ''});
})();
