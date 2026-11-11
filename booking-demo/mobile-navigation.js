/* Presentation only. The host retains route access and unsaved-change guards. */
(() => {
 'use strict';
 const paths=Object.freeze({
  dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  bookings:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  calendar:'M7 3v4M17 3v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  more:'M5 12h.01M12 12h.01M19 12h.01',
  services:'m20 13-7 7a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3ZM7 7h.01',
  staff:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  scheduling:'m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5',
  insights:'M4 20V10M10 20V4M16 20v-8M22 20H2',
  referrals:'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3ZM12 8h4a3 3 0 1 0-3-3l-1 3Z',
  integrations:'M8 3v5M16 3v5M6 8h12v3a6 6 0 0 1-6 6v4M8 8H6M18 8h-2',
  support:'M20 11a8 8 0 0 1-8 8H4l2-4a8 8 0 1 1 14-4Z M9 11h.01M12 11h.01M15 11h.01',
  settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
 });
 const main=Object.freeze([['dashboard','Dashboard'],['bookings','Bookings'],['calendar','Calendar'],['customers','Customers']].map(Object.freeze));
 const more=Object.freeze([['settings','Business Details'],['services','Services'],['staff','Staff'],['scheduling','Personalise'],['insights','Insights'],['integrations','Integrations'],['referrals','Referrals']].map(Object.freeze));
 const icon=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[key]+'"/></svg>';
 const allowed=(items,options)=>Array.isArray(options?.allowedRoutes)?items.filter(([route])=>options.allowedRoutes.includes(route)):items;
 function markup(active,options={}){
  const primary=allowed(main,options),extra=allowed(more,options),moreActive=!main.some(([route])=>route===active);
  return '<nav class="jg-mobile-bottom" aria-label="Workspace navigation" style="--jg-mobile-tab-count:'+(primary.length+(extra.length?1:0))+'">'+primary.map(([route,label])=>'<button type="button" class="jg-mobile-bottom-item" data-action="workspace-more-route" data-route="'+route+'" '+(active===route?'aria-current="page"':'')+'>'+icon(route)+'<span>'+label+'</span></button>').join('')+(extra.length?'<button type="button" class="jg-mobile-bottom-item" data-action="workspace-more" aria-haspopup="dialog" '+(moreActive?'aria-current="page"':'')+'>'+icon('more')+'<span>More</span></button>':'')+'</nav>';
 }
 function moreContent(options={}){
  const support = '<a href="https://www.jovamedia.com/?support=chat#ex-support" target="_blank" rel="noopener"><span class="jg-more-icon">'+icon('support')+'</span><span>Support</span><svg class="jg-more-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>';
  return '<nav class="jg-more-nav" aria-label="More workspace pages">'+allowed(more,options).map(([route,label])=>'<button type="button" data-action="workspace-more-route" data-route="'+route+'"><span class="jg-more-icon">'+icon(route)+'</span><span>'+label+'</span><svg class="jg-more-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>').join('')+(options.allowedRoutes ? '' : support)+'</nav>';
 }
 window.JovaMobileNavigation=Object.freeze({markup,moreContent});
})();
