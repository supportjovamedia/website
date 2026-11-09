/* Progressive owner-workspace selects. The native control remains the form source of truth. */
(() => {
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const svg=body=>'<svg viewBox="0 0 28 20" aria-hidden="true" focusable="false">'+body+'</svg>';
 const union='<rect width="28" height="20" fill="#173B82"/><path d="m0 0 28 20M28 0 0 20" stroke="#fff" stroke-width="5"/><path d="m0 0 28 20M28 0 0 20" stroke="#CF253C" stroke-width="2"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="8"/><path d="M14 0v20M0 10h28" stroke="#CF253C" stroke-width="4"/>';
 const star=(x,y,r=1)=>{const points=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.42:r;return(x+Math.cos(a)*d).toFixed(2)+','+(y+Math.sin(a)*d).toFixed(2);}).join(' ');return'<polygon points="'+points+'"/>';};
 const flags={GB:svg(union),US:svg('<rect width="28" height="20" fill="#fff"/>'+Array.from({length:7},(_,i)=>'<rect y="'+i*40/13+'" width="28" height="'+20/13+'" fill="#B22234"/>').join('')+'<rect width="12" height="10.8" fill="#3C3B6E"/><g fill="#fff">'+Array.from({length:5},(_,row)=>Array.from({length:6},(_,col)=>star(1+col*2,1+row*2,.6)).join('')).join('')+'</g>'),CA:svg('<rect width="28" height="20" fill="#fff"/><path d="M0 0h6v20H0zm22 0h6v20h-6z" fill="#D92535"/><path d="m14 3 1.2 3.4 1.8-1-.4 3 3-.7-1.1 2.1 1.6.5-4.8 4 .4 1.5-1.3-.2.2 2.4h-1.2l.2-2.4-1.3.2.4-1.5-4.8-4 1.6-.5-1.1-2.1 3 .7-.4-3 1.8 1z" fill="#D92535"/>'),AU:svg('<rect width="28" height="20" fill="#12377D"/><g transform="scale(.5)">'+union+'</g><g fill="#fff">'+star(7,15.4,2.2)+star(21,4,1.5)+star(18,10.5,1.5)+star(24.5,9.2,1.5)+star(21.7,16,1.8)+star(22.5,11.8,.8)+'</g>')};
 const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
 const enabledRows=select=>Array.from(select.options).map((option,index)=>({index,label:option.label||option.textContent||'',value:option.value,disabled:option.disabled||option.parentElement?.disabled===true,hidden:option.hidden||option.parentElement?.hidden===true,group:option.parentElement?.tagName==='OPTGROUP'?option.parentElement.label:''}));
 const nextIndex=(rows,current,delta)=>{const available=rows.filter(row=>!row.disabled&&!row.hidden);if(!available.length)return-1;const at=available.findIndex(row=>row.index===current);return available[Math.max(0,Math.min(available.length-1,at<0?(delta<0?available.length-1:0):at+delta))].index;};
 const matchText=(rows,text,current)=>{const available=rows.filter(row=>!row.disabled&&!row.hidden),ordered=[...available.filter(row=>row.index>current),...available.filter(row=>row.index<=current)],term=text.toLocaleLowerCase();return ordered.find(row=>row.label.trim().toLocaleLowerCase().startsWith(term))?.index??-1;};
 if(typeof module!=='undefined'&&module.exports)module.exports={enabledRows,nextIndex,matchText,flags};
 if(typeof document==='undefined'||!('showPopover' in HTMLElement.prototype))return;
 if(window.JovaWorkspaceSelect)return;
 const instances=new Map();let serial=0,opened=null,pending=false,suppressClick=null,typeBuffer='',typedAt=0,invalidFocusPending=false;
 const inScope=select=>!!select.closest('.shell.jb-reference')||!!(document.querySelector('.shell.jb-reference')&&select.closest('#modal-root form'));
 const eligible=select=>inScope(select)&&!select.multiple&&select.size<=1&&!select.hasAttribute('data-native-select');
 const country=select=>/country/i.test(select.name+' '+select.id);
 function labelFor(select){
  if(select.getAttribute('aria-label'))return select.getAttribute('aria-label');
  const by=select.getAttribute('aria-labelledby');if(by){const value=by.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(value)return value;}
  const label=select.labels?.[0];if(label){const copy=label.cloneNode(true);copy.querySelectorAll('select,input,button,textarea,.jws-select').forEach(node=>node.remove());const text=copy.textContent.trim();if(text)return text;}
  return select.name?.replace(/[_-]/g,' ')||'Select an option';
 }
 function signature(select){return JSON.stringify([select.selectedIndex,select.matches(':disabled'),select.required,select.getAttribute('aria-label'),select.getAttribute('aria-describedby'),enabledRows(select)]);}
 function optionMarkup(instance,row){const flag=country(instance.select)?flags[row.value.toUpperCase()]||'':'';return(flag?'<span class="jws-flag">'+flag+'</span>':'')+'<span class="jws-option-text">'+escape(row.label)+'</span>';}
 function sync(instance,force=false){
  const {select,button,popup}=instance,next=signature(select);if(!force&&instance.signature===next)return;
  instance.signature=next;instance.rows=enabledRows(select);button.disabled=select.matches(':disabled');
  const selected=instance.rows.find(row=>row.index===select.selectedIndex),label=labelFor(select);instance.label=label;
  button.innerHTML='<span class="jws-value">'+(selected?optionMarkup(instance,selected):'<span class="jws-option-text">Select an option</span>')+'</span><span class="jws-chevron">'+chevron+'</span>';
  button.setAttribute('aria-label',label+(selected?': '+selected.label:''));button.setAttribute('aria-required',String(select.required));popup.setAttribute('aria-label',label);
  if(select.getAttribute('aria-describedby'))button.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));else button.removeAttribute('aria-describedby');
  popup.replaceChildren();let previousGroup='';
  for(const row of instance.rows){
   if(row.hidden)continue;
   if(row.group&&row.group!==previousGroup){const heading=document.createElement('div');heading.className='jws-group';heading.textContent=row.group;popup.append(heading);}
   previousGroup=row.group;
   const item=document.createElement('div');item.className='jws-option';item.id=instance.id+'-option-'+row.index;item.dataset.index=row.index;item.setAttribute('role','option');item.setAttribute('aria-selected',String(row.index===select.selectedIndex));if(row.disabled)item.setAttribute('aria-disabled','true');
   item.innerHTML=optionMarkup(instance,row)+'<span class="jws-check">'+check+'</span>';popup.append(item);
  }
  if(select.validity.valid){button.removeAttribute('aria-invalid');instance.error.hidden=true;instance.error.textContent='';}
  if(opened===instance){if(button.disabled||!eligible(select))close(false);else{if(!instance.rows.some(row=>row.index===instance.active&&!row.disabled&&!row.hidden))instance.active=nextIndex(instance.rows,select.selectedIndex,0);activate(instance,instance.active);position(instance);}}
 }
 function position(instance){
  if(opened!==instance)return;const anchor=instance.button.getBoundingClientRect(),pad=10,gap=6,width=Math.min(Math.max(anchor.width,180),window.innerWidth-pad*2),below=window.innerHeight-anchor.bottom-gap-pad,above=anchor.top-gap-pad;
  const space=Math.max(90,Math.min(320,below>=Math.min(200,above)?below:above));
  Object.assign(instance.popup.style,{width:width+'px',maxHeight:space+'px',left:Math.max(pad,Math.min(anchor.left,window.innerWidth-width-pad))+'px',top:'0px',visibility:'hidden'});
  const height=instance.popup.getBoundingClientRect().height,top=below>=height||below>=above?anchor.bottom+gap:anchor.top-height-gap;
  Object.assign(instance.popup.style,{top:Math.max(pad,Math.min(top,window.innerHeight-height-pad))+'px',visibility:'visible'});
 }
 function activate(instance,index){
  instance.active=index;
  instance.popup.querySelectorAll('.jws-option').forEach(item=>item.classList.toggle('is-active',Number(item.dataset.index)===index));
  const item=instance.popup.querySelector('[data-index="'+index+'"]');if(item){instance.button.setAttribute('aria-activedescendant',item.id);item.scrollIntoView({block:'nearest'});}else instance.button.removeAttribute('aria-activedescendant');
 }
 function open(instance,last=false){
  sync(instance);if(instance.button.disabled)return;close(false);opened=instance;typeBuffer='';
  instance.popup.showPopover();instance.button.setAttribute('aria-expanded','true');
  instance.active=instance.rows.some(row=>row.index===instance.select.selectedIndex&&!row.disabled&&!row.hidden)?instance.select.selectedIndex:nextIndex(instance.rows,-1,last?-1:1);
  position(instance);activate(instance,instance.active);
 }
 function close(focus=true){
  const instance=opened;if(!instance)return;opened=null;instance.button.setAttribute('aria-expanded','false');instance.button.removeAttribute('aria-activedescendant');if(instance.popup.matches(':popover-open'))instance.popup.hidePopover();
  if(focus&&instance.button.isConnected)instance.button.focus({preventScroll:true});
 }
 function commit(instance,index){
  const row=instance.rows.find(item=>item.index===index);if(!row||row.disabled||row.hidden)return;
  const changed=instance.select.selectedIndex!==index;instance.select.selectedIndex=index;close(true);sync(instance,true);
  if(changed){instance.select.dispatchEvent(new Event('input',{bubbles:true}));instance.select.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 function keydown(event,instance){
  const key=event.key,show=opened===instance;if(key==='Tab'){if(show)close(false);return;}
  if(key==='Escape'&&show){event.preventDefault();event.stopPropagation();close();return;}
  if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)){
   event.preventDefault();event.stopPropagation();
   if(!show){open(instance,key==='ArrowUp');if(key==='Home'||key==='End')activate(instance,nextIndex(instance.rows,-1,key==='End'?-1:1));return;}
   if(key==='Enter'||key===' '){commit(instance,instance.active);return;}
   activate(instance,key==='Home'||key==='End'?nextIndex(instance.rows,-1,key==='End'?-1:1):nextIndex(instance.rows,instance.active,key==='ArrowUp'?-1:1));return;
  }
  if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();if(!show)open(instance);const now=Date.now();typeBuffer=now-typedAt<700?typeBuffer+key:key;typedAt=now;const repeated=typeBuffer.split('').every(char=>char===typeBuffer[0]),term=repeated?typeBuffer[0]:typeBuffer,index=matchText(instance.rows,term,instance.active);if(index>=0)activate(instance,index);}
 }
 function enhance(select){
  if(instances.has(select)||!eligible(select))return;
  const id='jws-'+(++serial),wrapper=document.createElement('span'),button=document.createElement('button'),popup=document.createElement('div'),error=document.createElement('span');
  wrapper.className='jws-select';button.type='button';button.className='jws-trigger';button.id=id+'-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',id+'-list');
  popup.className='jws-popover';popup.id=id+'-list';popup.setAttribute('popover','manual');popup.setAttribute('role','listbox');error.className='jws-error';error.hidden=true;error.setAttribute('role','alert');
  const original={tabindex:select.getAttribute('tabindex'),ariaHidden:select.getAttribute('aria-hidden')};
  const instance={id,select,wrapper,button,popup,error,original,rows:[],signature:null,active:-1};instances.set(select,instance);
  select.before(wrapper);wrapper.append(select,button,error);(select.closest('[role="dialog"]')||document.body).append(popup);select.classList.add('jws-native');select.setAttribute('tabindex','-1');select.setAttribute('aria-hidden','true');
  button.addEventListener('click',event=>{event.preventDefault();opened===instance?close():open(instance);});button.addEventListener('keydown',event=>keydown(event,instance));button.addEventListener('focus',()=>sync(instance));
  popup.addEventListener('pointerdown',event=>event.preventDefault());popup.addEventListener('click',event=>{const row=event.target.closest('.jws-option');if(row){event.preventDefault();event.stopPropagation();commit(instance,Number(row.dataset.index));}});
  popup.addEventListener('pointermove',event=>{const row=event.target.closest('.jws-option');if(row&&row.getAttribute('aria-disabled')!=='true')activate(instance,Number(row.dataset.index));});
  sync(instance,true);
 }
 function remove(instance){if(opened===instance)close(false);instance.popup.remove();instances.delete(instance.select);if(instance.select.isConnected){instance.select.classList.remove('jws-native');for(const [key,value]of[['tabindex',instance.original.tabindex],['aria-hidden',instance.original.ariaHidden]])value==null?instance.select.removeAttribute(key):instance.select.setAttribute(key,value);instance.wrapper.before(instance.select);instance.wrapper.remove();}}
 function refresh(){pending=false;for(const instance of instances.values())if(!instance.select.isConnected||!eligible(instance.select))remove(instance);document.querySelectorAll('.shell.jb-reference select,#modal-root form select').forEach(select=>{enhance(select);const instance=instances.get(select);if(instance)sync(instance);});}
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(refresh);}
 document.addEventListener('pointerdown',event=>{if(!opened||opened.popup.contains(event.target)||opened.button.contains(event.target))return;event.preventDefault();event.stopImmediatePropagation();suppressClick={target:event.target,until:Date.now()+700};close(false);},true);
 document.addEventListener('click',event=>{if(suppressClick){const consume=Date.now()<=suppressClick.until&&(suppressClick.target===event.target||suppressClick.target.contains?.(event.target));suppressClick=null;if(consume){event.preventDefault();event.stopImmediatePropagation();return;}}if(opened&&!opened.popup.contains(event.target)&&!opened.button.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();close(false);return;}const label=event.target.closest('label');if(label&&!(event.target.closest('button,input,textarea,a,.jws-popover'))){const instance=instances.get(label.querySelector('select'));if(instance){event.preventDefault();instance.button.focus();}}},true);
 document.addEventListener('focusin',event=>{const instance=instances.get(event.target);if(instance){instance.button.focus();return;}if(opened&&!opened.button.contains(event.target)&&!opened.popup.contains(event.target))close(false);},true);
 document.addEventListener('invalid',event=>{const instance=instances.get(event.target);if(!instance)return;event.preventDefault();instance.error.textContent=instance.select.validationMessage;instance.error.hidden=false;instance.button.setAttribute('aria-invalid','true');if(!invalidFocusPending){invalidFocusPending=true;instance.button.focus({preventScroll:true});setTimeout(()=>{invalidFocusPending=false;},0);}},true);
 document.addEventListener('change',event=>{if(instances.has(event.target))queueMicrotask(schedule);},true);document.addEventListener('input',event=>{if(instances.has(event.target))queueMicrotask(schedule);},true);document.addEventListener('reset',schedule,true);
 document.addEventListener('scroll',event=>{if(opened&&!opened.popup.contains(event.target))position(opened);},true);window.addEventListener('resize',()=>{if(opened)position(opened);});
 const observer=new MutationObserver(records=>{if(records.some(record=>{const target=record.target.nodeType===1?record.target:record.target.parentElement;return !target?.closest('.jws-popover,.jws-trigger,.jws-error');}))schedule();});
 const start=()=>{refresh();observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','hidden','required','value','label','aria-label','aria-describedby','multiple','size']});};
 window.JovaWorkspaceSelect=Object.freeze({refresh,close});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
