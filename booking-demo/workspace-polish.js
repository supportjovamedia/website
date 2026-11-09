/* One continuous editor. Scrolling changes navigation state, never form state. */
(() => {
 'use strict';
 document.documentElement.dataset.inputMode='pointer';
 document.addEventListener('pointerdown',()=>{document.documentElement.dataset.inputMode='pointer';},true);
 document.addEventListener('keydown',event=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))document.documentElement.dataset.inputMode='keyboard';},true);
 let pending=false;
 function update(){
  pending=false;
  const nav=document.querySelector('.jg-personalise-nav');
  if(!nav)return;
  const header=document.querySelector('.workspace-header');
  const scroller=nav.closest('.workspace-main');
  const contentScroll=scroller&&getComputedStyle(scroller).overflowY==='auto';
  const top=contentScroll?-(parseFloat(getComputedStyle(scroller).paddingTop)||0):header&&['sticky','fixed'].includes(getComputedStyle(header).position)?Math.ceil(header.getBoundingClientRect().height):0;
  const offset=top+'px';
  if(nav.style.getPropertyValue('--jg-sticky-top')!==offset)nav.style.setProperty('--jg-sticky-top',offset);
  const sectionOffset=(Math.max(0,top)+nav.getBoundingClientRect().height+24)+'px';
  const editor=nav.closest('.jg-personalise');
  if(editor.style.getPropertyValue('--jg-section-offset')!==sectionOffset)editor.style.setProperty('--jg-section-offset',sectionOffset);
  const booking=document.getElementById('personalise-booking');
  const active=nav.dataset.navigation==='panels'?(nav.dataset.active||'website'):(booking&&booking.getBoundingClientRect().top<=nav.getBoundingClientRect().bottom+64?'booking':'website');
  nav.querySelectorAll('[data-section]').forEach(button=>{
   const value=String(button.dataset.section===active);
   if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);
  });
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
 document.addEventListener('scroll',schedule,{passive:true,capture:true});
 let dismissingMenu=false,isolatedMenu=null,menuInert=[],menuScroll=[];
 function releaseMenu(){
  menuInert.forEach(([element,previous])=>{element.inert=previous;});menuInert=[];
  menuScroll.forEach(([element,previous])=>{element.style.overflow=previous;});menuScroll=[];
  document.body.classList.remove('jg-action-menu-open');isolatedMenu=null;
 }
 function isolateMenu(menu){
  if(isolatedMenu===menu)return;releaseMenu();if(!menu)return;isolatedMenu=menu;
  // Disable sibling branches, never the ancestor containing the open popover.
  for(let branch=menu;branch&&branch!==document.body;branch=branch.parentElement){
   for(const sibling of branch.parentElement?.children||[]){
    if(sibling===branch||['SCRIPT','STYLE','LINK'].includes(sibling.tagName))continue;
    menuInert.push([sibling,sibling.inert]);sibling.inert=true;
   }
  }
  for(const element of [document.body,document.querySelector('.workspace-main')].filter(Boolean)){
   menuScroll.push([element,element.style.overflow]);element.style.overflow='hidden';
  }
  document.getSelection()?.removeAllRanges();document.body.classList.add('jg-action-menu-open');
  if(!menu.contains(document.activeElement))menu.querySelector('button,a[href]')?.focus({preventScroll:true});
 }
 function syncMenu(){isolateMenu(document.querySelector('.mg-action-list:popover-open'));}
 document.addEventListener('toggle',event=>{if(event.target.matches?.('.mg-action-list[popover]'))syncMenu();},true);
 document.addEventListener('keydown',event=>{
  const menu=isolatedMenu;if(!menu)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();const trigger=menu.closest('details')?.querySelector('summary');menu.hidePopover();const owner=menu.closest('details');if(owner)owner.open=false;releaseMenu();trigger?.focus({preventScroll:true});return;}
  if(event.key==='Tab'){
   const controls=[...menu.querySelectorAll('button,a[href]')].filter(el=>!el.disabled);
   if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}
   else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}
  }
 },true);
 document.addEventListener('pointerdown',event=>{
  const menu=document.querySelector('.mg-action-list:popover-open');
  if(!menu||menu.contains(event.target))return;
  dismissingMenu=true;event.preventDefault();event.stopImmediatePropagation();menu.hidePopover();releaseMenu();
  const owner=menu.closest('details');if(owner)owner.open=false;
 },true);
 document.addEventListener('click',event=>{
  if(!dismissingMenu)return;dismissingMenu=false;event.preventDefault();event.stopImmediatePropagation();
 },true);
 window.addEventListener('resize',schedule,{passive:true});
 new MutationObserver(()=>{schedule();if(isolatedMenu&&!isolatedMenu.isConnected)releaseMenu();}).observe(document.body,{childList:true,subtree:true});
 schedule();
})();
