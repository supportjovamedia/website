/* Desktop sidebar disclosure. Preference is browser-only; business records are never changed. */
(() => {
 'use strict';
 if(window.JovaSidebar)return;
 const KEY='jovabook-sidebar-pinned',QUERY='(min-width: 1001px) and (hover: hover) and (pointer: fine)';
 let preference=false,started=false,queued=false,observer;
 try{preference=localStorage.getItem(KEY)==='1';}catch{}
 const media=window.matchMedia(QUERY);
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 9V4l1-1H7l1 1v5l-3 3v2h14v-2l-3-3ZM12 14v8"/></svg>';
 function labels(sidebar){
  sidebar.querySelectorAll('.jb-nav-section>a,.jb-more-settings>summary').forEach(link=>{
   if(link.querySelector('.sb-nav-label'))return;
   const text=[...link.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());if(!text.length)return;
   const label=document.createElement('span');label.className='sb-nav-label';label.textContent=text.map(node=>node.textContent.trim()).join(' ');text.forEach(node=>node.remove());link.append(label);
  });
  const brand=sidebar.querySelector('.brand.jb-wordmark');
  if(brand&&!brand.querySelector('.sb-brand-label')){const label=document.createElement('span');label.className='sb-brand-label';label.textContent='JovaBook';brand.append(label);}
  if(!sidebar.querySelector('.sb-pin')){const button=document.createElement('button');button.type='button';button.className='sb-pin';button.dataset.sidebarPin='';button.innerHTML=icon+'<span class="sb-pin-text"></span>';sidebar.insertBefore(button,sidebar.querySelector('.bottom'));}
 }
 function sync(shell=document.querySelector('.shell')){
  if(!shell)return;
  const sidebar=shell.querySelector(':scope>.sidebar');if(!sidebar)return;
  labels(sidebar);shell.classList.add('sb-enhanced');shell.classList.toggle('sb-desktop',media.matches);shell.classList.toggle('sb-pinned',preference);
  const expanded=media.matches&&(preference||sidebar.matches(':hover')||sidebar.contains(document.activeElement));shell.classList.toggle('sb-expanded',expanded);
  const button=sidebar.querySelector('.sb-pin'),label=preference?'Unpin sidebar':'Pin sidebar';button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(preference));button.setAttribute('aria-expanded',String(expanded));const caption=button.querySelector('.sb-pin-text');if(caption.textContent!==label)caption.textContent=label;
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
 function sidebarFrom(target){return target instanceof Element?target.closest('.sidebar'):null;}
 function start(){
  if(started)return;started=true;
  document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('[data-sidebar-pin]'):null;if(!button||!media.matches)return;event.preventDefault();preference=!preference;try{localStorage.setItem(KEY,preference?'1':'0');}catch{}if(event.detail>0)button.blur();sync(button.closest('.shell'));});
  document.addEventListener('pointerover',event=>{const sidebar=sidebarFrom(event.target);if(sidebar&&!sidebar.contains(event.relatedTarget))sync(sidebar.closest('.shell'));});
  document.addEventListener('pointerout',event=>{const sidebar=sidebarFrom(event.target);if(sidebar&&!sidebar.contains(event.relatedTarget))queueMicrotask(()=>sync(sidebar.closest('.shell')));});
  document.addEventListener('focusin',event=>{const sidebar=sidebarFrom(event.target);if(sidebar)sync(sidebar.closest('.shell'));});
  document.addEventListener('focusout',event=>{const sidebar=sidebarFrom(event.target);if(sidebar)queueMicrotask(()=>sync(sidebar.closest('.shell')));});
  window.addEventListener('storage',event=>{if(event.key!==KEY)return;preference=event.newValue==='1';sync();});
  media.addEventListener('change',schedule);
  observer=new MutationObserver(schedule);observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.JovaSidebar=Object.freeze({key:KEY,sync:()=>sync(),isPinned:()=>preference});
})();
