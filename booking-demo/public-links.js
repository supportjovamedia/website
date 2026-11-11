/* Public address parsing only. The backend still checks the exact requested slug. */
(() => {
  'use strict';
  const demoSlug = 'jova-demo';
  const reserved = new Set(['www','app','admin','support','salon','api','bookings','book','mail','help','billing','status','blog','login','signup','dashboard','jova','jovamedia','jovabook','staging','test','demo','owner','operator','customer','auth','callback','recovery','reset','forgot','register','index','assets','fonts','images','scripts','styles','config','health','robots','favicon','sitemap']);
  const validSlug = value => typeof value === 'string' && value.length >= 3 && value.length <= 30 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const cleanSlug = value => validSlug(value) && value !== demoSlug && !reserved.has(value);
  function hostBusiness(location=window.location){try{const host=String(location.hostname||new URL(location.href||location.origin).hostname).toLowerCase(),match=/^([a-z0-9-]+)\.jovamedia\.com$/.exec(host);return match&&cleanSlug(match[1])?match[1]:'';}catch{return '';}}
  function resolve(location = window.location) {
    const empty = {slug: '', demo: false, route: ''};
    if (!location || typeof location.pathname !== 'string') return empty;
    const pathname = location.pathname, query = new URLSearchParams(location.search || '');
    if (query.getAll('salon').length > 1 || query.getAll('demo').length > 1) return empty;
    const tenant=hostBusiness(location);
    const salon = query.get('salon'), demo = query.get('demo');
    if(tenant){if(demo!==null||salon!==null&&salon!==tenant)return empty;const tenantRoutes={'':'website','/':'website','/book':'book/service','/login':'customer/login','/register':'customer/register','/account':'customer/bookings','/about':'website/about','/contact':'website/contact'};const path=pathname.replace(/\/$/,'')||'/';let route=tenantRoutes[path];if(!route&&/^\/book\/(service|time|choice|details|payment|confirmation)$/.test(path))route=path.slice(1);if(!route&&/^\/account\/(login|register|forgot|reset|bookings|profile|payments)$/.test(path))route='customer/'+path.split('/')[2];return route?{slug:tenant,demo:false,route}:empty;}
    const home = pathname === '/' || pathname === '/index.html';
    const parts=pathname.slice(1).split('/'),candidate=parts[0],tail=parts.slice(1).join('/');
    const routes={'':'website',about:'website/about',contact:'website/contact',book:'book/service','book/service':'book/service','book/time':'book/time','book/choice':'book/choice','book/details':'book/details','book/payment':'book/payment','book/confirmation':'book/confirmation',account:'customer/bookings','account/login':'customer/login','account/register':'customer/register','account/forgot':'customer/forgot','account/reset':'customer/reset','account/bookings':'customer/bookings','account/payments':'customer/payments','account/profile':'customer/profile'};
    if(!home&&(!Object.hasOwn(routes,tail)||pathname.endsWith('/')))return empty;
    if (!home && !cleanSlug(candidate)) return empty;
    if (demo !== null && demo !== demoSlug) return empty;
    if (demo === demoSlug || salon === demoSlug) return {slug: '', demo: true, route:''};
    if (salon !== null && (!validSlug(salon) || (!home && salon !== candidate))) return empty;
    const slug=salon||(cleanSlug(candidate)?candidate:'');
    return {slug,demo:false,route:slug?(home?'website':routes[tail]):''};
  }
  function build(slug, hash, {demo = false, location = window.location} = {}) {
    if (!validSlug(slug) || (!demo && slug === demoSlug) || (demo && slug !== demoSlug)) return '';
    let origin;
    try { const url = new URL(location.origin || location.href); if (!['http:', 'https:'].includes(url.protocol)) return ''; origin = url.origin; } catch { return ''; }
    const url = new URL(origin + '/');
    if(!demo&&cleanSlug(slug)&&/^https:\/\/(?:[a-z0-9-]+\.)?jovamedia\.com$/.test(origin)){url.hostname=slug+'.jovamedia.com';url.pathname=hash==='book/service'?'/book':hash.startsWith('book/')?'/'+hash:hash==='website'?'/':hash.startsWith('website/')?'/'+hash.slice(8):hash==='customer/bookings'?'/account':hash.startsWith('customer/')?'/account/'+hash.slice(9):'/';return url.href;}
    if (demo) url.searchParams.set('demo', demoSlug);
    else if (cleanSlug(slug)) {
      const path=hash==='book/service'?'book':hash.startsWith('book/')?hash:hash==='website'?'':hash.startsWith('website/')?hash.slice(8):hash==='customer/bookings'?'account':hash.startsWith('customer/')?'account/'+hash.slice(9):'';
      url.pathname='/'+slug+(path?'/'+path:'');return url.href;
    }
    else url.searchParams.set('salon', slug); // Keep legacy businesses with reserved names reachable.
    url.hash = hash;
    return url.href;
  }
  function website(slug, {page = 'home', ...options} = {}) {
    if (!['home','about','contact'].includes(page)) return '';
    const current = options.location || window.location;
    if (!options.demo && cleanSlug(slug) && /^https:\/\/(?:[a-z0-9-]+\.)?jovamedia\.com$/.test(current.origin || '')) {
      return 'https://www.jovamedia.com/book/' + slug + (page === 'home' ? '' : '#' + page);
    }
    return build(slug, 'website' + (page === 'home' ? '' : '/' + page), options);
  }
  window.JovaPublicLinks = Object.freeze({resolve, validSlug, hostBusiness, addressLabel:slug=>{const value=build(slug,'website',{location:{origin:'https://book.jovamedia.com'}});return value?new URL(value).hostname:'';}, booking:(slug,{step='service',...options}={})=>['service','time','choice','details','payment','confirmation'].includes(step)?build(slug,'book/'+step,options):'', account:(slug,{page='bookings',...options}={})=>['login','register','forgot','reset','bookings','profile','payments'].includes(page)?build(slug,'customer/'+(page==='payments'?'bookings':page),options):'', website});
})();
