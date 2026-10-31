/* Desktop disclosure and viewport-safe Settings. No business records are changed. */
(() => {
 'use strict';
 if(window.JovaSidebar)return;
 const KEY='jovabook-sidebar-pinned',QUERY='(min-width: 1001px) and (hover: hover) and (pointer: fine)';
 let preference=false,started=false,queued=false,observer,settings=null,positionQueued=false,pointerSummary=null;
 try{preference=localStorage.getItem(KEY)==='1';}catch{}
 const media=window.matchMedia(QUERY),prepared=new WeakSet();
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 9V4l1-1H7l1 1v5l-3 3v2h14v-2l-3-3ZM12 14v8"/></svg>';
 const nativePopover=panel=>typeof panel.showPopover==='function'&&typeof panel.hidePopover==='function';
 const nativeOpen=panel=>nativePopover(panel)&&panel.matches(':popover-open');
 const isOpen=()=>!!settings&&settings.panel.isConnected&&(nativeOpen(settings.panel)||settings.panel.classList.contains('is-open'));
 const viewport=()=>{const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};};
 const visible=element=>!!element&&element.isConnected&&element.getBoundingClientRect().width>0&&element.getBoundingClientRect().height>0;
 function closeSettings({restore=false}={}){
  const current=settings;if(!current)return;settings=null;
  try{if(nativeOpen(current.panel))current.panel.hidePopover();}catch{}
  current.panel.classList.remove('is-open');current.details.open=false;current.summary.setAttribute('aria-expanded','false');
  if(restore){const target=visible(current.summary)?current.summary:document.querySelector('.jb-mobile-nav');if(visible(target))target.focus({preventScroll:true});}
  sync();
 }
 function positionSettings(){
  if(!isOpen())return;
  const {panel,summary,sidebar}=settings,view=viewport(),margin=8,gap=8;
  const anchor=summary.getBoundingClientRect(),edge=sidebar.getBoundingClientRect(),right=view.left+view.width,bottom=view.top+view.height;
  if(!visible(summary)){closeSettings({restore:true});return;}
  if(anchor.bottom<view.top||anchor.top>bottom){closeSettings();return;}
  const width=Math.min(232,view.width-margin*2),maximum=Math.max(40,view.height-margin*2);
  panel.style.width=width+'px';panel.style.maxHeight=maximum+'px';
  let height=Math.min(panel.getBoundingClientRect().height,maximum),left,top,placement;
  if(right-edge.right-gap-margin>=width){left=edge.right+gap;top=anchor.top;placement='right';}
  else if(edge.left-view.left-gap-margin>=width){left=edge.left-gap-width;top=anchor.top;placement='left';}
  else {
   const below=bottom-margin-anchor.bottom-gap,above=anchor.top-gap-view.top-margin;
   const down=below>=height||below>=above;
   const available=Math.max(40,Math.min(maximum,down?below:above));panel.style.maxHeight=available+'px';height=Math.min(panel.getBoundingClientRect().height,available);
   left=anchor.left;top=down?anchor.bottom+gap:anchor.top-gap-height;placement=down?'below':'above';
  }
  top=Math.max(view.top+margin,Math.min(top,bottom-margin-height));left=Math.max(view.left+margin,Math.min(left,right-margin-width));
  panel.style.left=Math.round(left)+'px';panel.style.top=Math.round(top)+'px';panel.dataset.placement=placement;
  const active=document.activeElement;if(active&&panel.contains(active)){const item=active.getBoundingClientRect(),box=panel.getBoundingClientRect();if(item.bottom>box.bottom-5)panel.scrollTop+=item.bottom-box.bottom+5;else if(item.top<box.top+5)panel.scrollTop-=box.top-item.top+5;}
 }
 function schedulePosition(){if(positionQueued)return;positionQueued=true;requestAnimationFrame(()=>{positionQueued=false;positionSettings();});}
 function prepareSettings(sidebar){
  const details=sidebar.querySelector('.jb-more-settings'),summary=details?.querySelector(':scope>summary'),panel=details?.querySelector(':scope>.st-settings-links');if(!panel||prepared.has(panel))return;
  prepared.add(panel);panel.classList.add('sb-settings-panel');panel.id='jovabook-settings-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Settings');panel.setAttribute('aria-modal','false');
  if(nativePopover(panel))panel.setAttribute('popover','auto');
  summary.setAttribute('aria-controls',panel.id);summary.setAttribute('aria-haspopup','dialog');summary.setAttribute('aria-expanded','false');
  panel.addEventListener('toggle',event=>{if(event.newState==='closed'&&!nativeOpen(panel)&&settings?.panel===panel)closeSettings();});
  details.addEventListener('toggle',()=>{if(!details.open&&settings?.panel===panel)closeSettings();});
 }
 function openSettings(summary,{keyboard=false,last=false,toggle=true}={}){
  const details=summary.closest('.jb-more-settings'),sidebar=summary.closest('.sidebar'),panel=details?.querySelector(':scope>.st-settings-links');if(!panel||!sidebar)return;
  if(isOpen()&&settings.panel===panel){if(!toggle){const items=[...panel.querySelectorAll('a[href],button:not(:disabled)')];if(keyboard)(last?items.at(-1):items[0])?.focus({preventScroll:true});positionSettings();return;}closeSettings();if(!keyboard)summary.blur();return;}
  closeSettings();prepareSettings(sidebar);settings={details,summary,panel,sidebar};details.open=true;summary.setAttribute('aria-expanded','true');panel.scrollTop=0;
  if(nativePopover(panel))panel.showPopover();else panel.classList.add('is-open');
  sync(sidebar.closest('.shell'));positionSettings();
  if(keyboard){const items=[...panel.querySelectorAll('a[href],button:not(:disabled)')];(last?items.at(-1):items[0])?.focus({preventScroll:true});positionSettings();}
 }
 function labels(sidebar){
  sidebar.querySelectorAll('.jb-nav-section>a,.jb-more-settings>summary').forEach(link=>{
   if(link.querySelector('.sb-nav-label'))return;
   const text=[...link.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());if(!text.length)return;
   const label=document.createElement('span');label.className='sb-nav-label';label.textContent=text.map(node=>node.textContent.trim()).join(' ');text.forEach(node=>node.remove());link.append(label);
  });
  const brand=sidebar.querySelector('.brand.jb-wordmark');
  if(brand&&!brand.querySelector('.sb-brand-label')){const label=document.createElement('span');label.className='sb-brand-label';label.textContent='JovaBook';brand.append(label);}
  let footer=sidebar.querySelector(':scope>.sb-footer');if(!footer){footer=document.createElement('div');footer.className='sb-footer';sidebar.insertBefore(footer,sidebar.querySelector('.bottom'));}
  let button=sidebar.querySelector('.sb-pin');if(!button){button=document.createElement('button');button.type='button';button.className='sb-pin';button.dataset.sidebarPin='';button.innerHTML=icon+'<span class="sb-pin-text"></span>';}
  if(button.parentElement!==footer)footer.append(button);prepareSettings(sidebar);
 }
 function sync(shell=document.querySelector('.shell')){
  if(settings&&!settings.panel.isConnected)closeSettings();
  if(!shell)return;
  const sidebar=shell.querySelector(':scope>.sidebar');if(!sidebar)return;
  labels(sidebar);shell.classList.add('sb-enhanced');shell.classList.toggle('sb-desktop',media.matches);shell.classList.toggle('sb-pinned',preference);
  const expanded=media.matches&&(preference||sidebar.matches(':hover')||sidebar.contains(document.activeElement)||(isOpen()&&settings.sidebar===sidebar));shell.classList.toggle('sb-expanded',expanded);
  const button=sidebar.querySelector('.sb-pin'),label=preference?'Unpin sidebar':'Pin sidebar';button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(preference));button.setAttribute('aria-expanded',String(expanded));const caption=button.querySelector('.sb-pin-text');if(caption.textContent!==label)caption.textContent=label;
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();if(isOpen())schedulePosition();});}
 function sidebarFrom(target){return target instanceof Element?target.closest('.sidebar'):null;}
 function start(){
  if(started)return;started=true;
  document.addEventListener('pointerdown',event=>{const summary=event.target instanceof Element?event.target.closest('.jb-more-settings>summary'):null;pointerSummary=summary&&settings?.summary===summary?summary:null;},true);
  document.addEventListener('click',event=>{
   const target=event.target instanceof Element?event.target:null,summary=target?.closest('.jb-more-settings>summary');
   if(summary){event.preventDefault();const closing=event.detail>0&&pointerSummary===summary;pointerSummary=null;if(closing){closeSettings();summary.blur();return;}openSettings(summary,{keyboard:event.detail===0});return;}pointerSummary=null;
   if(isOpen()){
    const inside=settings.panel.contains(target);if(!inside||target?.closest('a[href],button'))closeSettings();
   }
  },true);
  document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('[data-sidebar-pin]'):null;if(!button||!media.matches)return;event.preventDefault();preference=!preference;try{localStorage.setItem(KEY,preference?'1':'0');}catch{}if(event.detail>0)button.blur();sync(button.closest('.shell'));});
  document.addEventListener('keydown',event=>{
   const target=event.target instanceof Element?event.target:null,summary=target?.closest('.jb-more-settings>summary');
   if(summary&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openSettings(summary,{keyboard:true,last:event.key==='ArrowUp',toggle:false});return;}
   if(!isOpen())return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSettings({restore:true});return;}
   if(settings.panel.contains(target)&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();const items=[...settings.panel.querySelectorAll('a[href],button:not(:disabled)')],index=items.indexOf(target),next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus({preventScroll:true});positionSettings();
   }
  },true);
  document.addEventListener('pointerover',event=>{const sidebar=sidebarFrom(event.target);if(sidebar&&!sidebar.contains(event.relatedTarget))sync(sidebar.closest('.shell'));});
  document.addEventListener('pointerout',event=>{const sidebar=sidebarFrom(event.target);if(sidebar&&!sidebar.contains(event.relatedTarget))queueMicrotask(()=>sync(sidebar.closest('.shell')));});
  document.addEventListener('focusin',event=>{if(isOpen()&&!settings.panel.contains(event.target)&&event.target!==settings.summary)closeSettings();const sidebar=sidebarFrom(event.target);if(sidebar)sync(sidebar.closest('.shell'));});
  document.addEventListener('focusout',event=>{const sidebar=sidebarFrom(event.target);if(sidebar)queueMicrotask(()=>sync(sidebar.closest('.shell')));});
  window.addEventListener('storage',event=>{if(event.key!==KEY)return;preference=event.newValue==='1';sync();});
  window.addEventListener('hashchange',()=>closeSettings());window.addEventListener('resize',schedulePosition);
  window.addEventListener('scroll',event=>{if(!isOpen()||(event.target instanceof Node&&settings.panel.contains(event.target)))return;schedulePosition();},true);
  window.visualViewport?.addEventListener('resize',schedulePosition);window.visualViewport?.addEventListener('scroll',schedulePosition);
  media.addEventListener('change',schedule);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.JovaSidebar=Object.freeze({key:KEY,sync:()=>sync(),isPinned:()=>preference,closeSettings:()=>closeSettings()});
})();
