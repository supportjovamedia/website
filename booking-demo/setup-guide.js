/* Guided setup uses saved business data and a per-business browser checkpoint. */
(() => {
 'use strict';
 const tool=(action,selector,label,text,value,closeText)=>({key:action+(value?':'+value:''),selector,label,text,closeText});
 const steps=[
  {id:'theme',title:'Your dashboard',route:'dashboard',target:'.workspace-header [data-action="workspace-appearance"]',text:'Take a look around your dashboard.',next:'Bookings',micro:[
   tool('workspace-appearance','.workspace-header [data-action="workspace-appearance"]','Workspace theme','Tap the palette to try a workspace theme.',undefined,'Happy with your theme? Tap the X to continue, or pick another one first.'),
   tool('notif-open','.workspace-header [data-action="notif-open"]','Notifications','Tap the bell to see your latest booking alerts.',undefined,'These are your latest alerts. Tap the X when you are done.')]},
  {id:'bookings',title:'Bookings',route:'bookings',target:'[data-action="bookings-filters"]',text:'Find and manage your appointments here.',next:'Calendar',micro:[
   tool('bookings-filters','[data-action="bookings-filters"]','Try filters','Use Filters to narrow bookings by status, service or team member.',undefined,'These filters narrow down your bookings. Have a look, then tap the X to continue.'),
   tool('new-booking','[data-action="new-booking"]','New booking','Tap New booking to see how you add an appointment yourself.',undefined,'This is how you add a booking. You do not have to add one. Tap the X to continue.')]},
  {id:'calendar',title:'Calendar',route:'calendar',target:'.db-period-controls',text:'See your schedule day by day.',next:'Customers',micro:[
   tool('cal-view','[data-action=cal-view][data-value=day]','Day view','Day shows one date at a time.','day'),
   tool('cal-view','[data-action=cal-view][data-value=week]','Week view','Week shows seven days side by side.','week'),
   tool('cal-view','[data-action=cal-view][data-value=month]','Month view','Month gives you the big picture.','month'),
   tool('new-booking','[data-action="new-booking"]','New booking','Tap New booking to add an appointment from the calendar.',undefined,'This is how you add a booking. You do not have to add one. Tap the X to continue.')]},
  {id:'customers',title:'Customers',route:'customers',target:'[data-action="add-customer"]',text:'Keep your client list here.',next:'Business information',micro:[
   tool('add-customer','[data-action="add-customer"]','Add customer','Tap Add customer to see how it works. You do not need to add anyone.',undefined,'This is how you add a customer. You do not need to add anyone. Tap the X to continue.')]},
  {id:'details',title:'Business information',route:'settings',target:'[name=name]',next:'Working hours',text:'Check your business details. If you have no fixed address, use the checkbox under Address.'},
  {id:'hours',title:'Working hours',route:'availability',target:'.ws-daily-row',next:'Categories',text:'Choose the days and times clients can book, then select Save.'},
  {id:'category',title:'Add a service category',route:'services',target:'[data-action="add-category"]',next:'Services',text:'Select the highlighted Category button. Give it a name, choose a color, then select Add category.'},
  {id:'services',title:'Add a service',route:'services',target:'[data-action="add-service"]',next:'Your website',text:'Select the highlighted Add service button. Enter the name, category, price and duration, then confirm who offers it.'},
  {id:'website',title:'Set up your website',route:'scheduling',target:'[data-bw-section]:not([hidden])',text:'Choose how your website looks and what clients see.'},
  {id:'booking',title:'Booking page',route:'booking-setup',target:'.bw-settings-intro',text:'This is the page clients use to book. Look it over, then tap Continue.',next:'Share your links'},
  {id:'share',title:'Share your links',route:'dashboard',target:'.workspace-header [data-action="share-booking-link"]',text:'Share your website and booking links with clients.',micro:[
   tool('share-booking-link','.workspace-header [data-action="share-booking-link"]','Share links','Tap Share links to copy your website and booking links.',undefined,'Copy a link if you like, then tap the X to finish.')]}
 ];
 const taskIds=['details','hours','category','services','website'];
 const order=steps.map(step=>step.id);
 const tourFirst=new Set(['theme','bookings','calendar','customers']);
 const microKeys=(id)=>(steps.find(step=>step.id===id)?.micro||[]).map(m=>id+':'+m.key);
 const sections=[
  ['design','Choose a website design. Save a new choice or continue with the current one.'],
  ['colours','Choose colors for buttons and headings, or keep the defaults.'],
  ['hero','Check the headline at the top of your website. A logo and banner image are optional.'],
  ['about','Add a short introduction if you would like clients to know more about your business.'],
  ['search','Choose whether Google can find your website and whether to hide your street address. Both choices are optional.']
 ];
 const getStep=id=>steps.find(step=>step.id===id);
 const destination=id=>{const step=getStep(id);return step?step.route+'?setup='+step.id:'dashboard';};
 const defaultState={mode:'new',step:'',section:'design',websiteReviewed:false,skipped:false,replayed:false,dismissed:false,waived:[],seen:[]};
 function createState(storage){
  const memory=new Map();
  const key=(owner,business)=>'jovabook-setup-guide-v2:'+JSON.stringify([owner,business]);
  function read(owner,business){
   const id=key(owner,business);let stored=memory.get(id);
   if(!stored){try{stored=JSON.parse(storage?.getItem(id)||'null');}catch{}}
   const valid=stored&&['paused','active','done'].includes(stored.mode);
   if(!valid)return {...defaultState};
   return {mode:stored.mode,step:getStep(stored.step)?.id||'',section:sections.some(([id])=>id===stored.section)?stored.section:'design',websiteReviewed:stored.websiteReviewed===true,skipped:stored.skipped===true,replayed:stored.replayed===true,dismissed:stored.dismissed===true,waived:Array.isArray(stored.waived)?stored.waived.filter(id=>taskIds.includes(id)):[],seen:Array.isArray(stored.seen)?stored.seen.filter(key=>typeof key==='string'&&key.length<80).slice(0,60):[]};
  }
  function write(owner,business,change){
   const id=key(owner,business),state={...read(owner,business),...change};
   memory.set(id,state);try{storage?.setItem(id,JSON.stringify(state));}catch{}
   return state;
  }
  return {read,write};
 }
 function status(s,{bookable=service=>(service.staffIds||[]).some(id=>(s.staff||[]).some(member=>member.id===id&&member.active!==false)),hasHours,addressRequired=true,guide=defaultState}={}){
  const hours=s.hours||{},time=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const working=typeof hasHours==='boolean'?hasHours:Array.isArray(hours.days)&&hours.days.some(day=>Number.isInteger(day)&&day>=0&&day<=6)&&time(hours.start)&&time(hours.end)&&hours.end>hours.start;
  const website=s.workspace?.website||{};
  const service=(s.services||[]).some(bookable);
  const complete={
   details:!!String(s.name||'').trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email||'')&&String(s.phone||'').replace(/\D/g,'').length>=7&&(!addressRequired||String(s.address||'').trim().length>=3),
   hours:working,category:service||(s.categories||[]).length>0,services:service,
   website:guide.websiteReviewed||[website.headline,website.heroImage,website.about,website.homeIntro,website.template].some(value=>!!String(value||'').trim())
  };
  const tasks=steps.filter(step=>taskIds.includes(step.id)).map(step=>({...step,done:complete[step.id],covered:complete[step.id]||(guide.waived||[]).includes(step.id)}));
  return {tasks,completed:tasks.filter(task=>task.covered).length,total:tasks.length,ready:tasks.every(task=>task.done)};
 }
 // Steps whose information is already there are not shown again. The built-in demo salon still walks through hours, categories and services.
 function skippable(s,options={},{showAll=false}={}){
  return status(s,options).tasks.filter(task=>['details','hours','category','services'].includes(task.id)&&task.done&&(!showAll||task.id==='details')).map(task=>task.id);
 }
 function nextStep(s,options){return status(s,options).tasks.find(task=>!task.covered)||getStep('booking');}
 function resumeStep(s,options){
  const saved=getStep(options.guide?.step);
  const next=nextStep(s,options);
  if(!saved)return getStep('theme');
  if(tourFirst.has(saved.id))return saved;
  if(saved.id==='website'&&next.id==='booking')return saved;
  if(order.indexOf(saved.id)>=order.indexOf('booking')&&next.id==='booking')return saved;
  return next;
 }
 const doneText=id=>id==='share'?'Nice work. Finishing up…':'Nice work. Moving on…';
 const currentMicro=(id,seen=[])=>(getStep(id)?.micro||[]).find(m=>!seen.includes(id+':'+m.key));
 const button=(action,label,kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+action+'">'+label+'</button>';

 function renderStep(s,options,id){
  const step=getStep(id);if(!step)return '';
  const guide=options.guide||defaultState;
  const section=sections.find(([key])=>key===guide.section)||sections[0];
  const micro=currentMicro(id,guide.seen||[]),lead=step.micro?(micro?micro.text:doneText(id)):step.text;
  const list=order.filter(key=>key===id||!(options.skip||[]).includes(key));
  const index=list.indexOf(id);
  // Everything moves on by itself once the action is done. The only buttons are Skip step, or one Continue where there is nothing to do.
  const cta=id==='booking'?button('setup-continue','Continue','primary'):id==='share'?button('setup-finish','Finish demo','primary'):button('setup-continue','Skip step','jg-ghost');
  const jump='';
  const back='<button type="button" class="jg-setup-icon" data-action="setup-back" aria-label="Back"'+(order.indexOf(id)>0?'':' hidden')+'>‹</button>';
  const close='<button type="button" class="jg-setup-icon" data-action="setup-pause" aria-label="Exit demo">Exit</button>';
  return '<aside class="jg-setup-tip" aria-label="Setup guide" data-step="'+id+'"><div class="jg-setup-tip-top">'+back+'<span class="jg-setup-count">Step '+(index+1)+' of '+list.length+'</span>'+close+'</div><div><p id="jg-setup-instruction">'+(id==='website'?section[1]:lead)+'</p>'+jump+'</div><div class="jg-setup-tip-actions">'+cta+'</div></aside>';
 }
 function progressValue(s,options){
  const guide=options.guide||defaultState,done=guide.mode==='done';
  if(done)return 100;
  const list=order.filter(key=>key===guide.step||!(options.skip||[]).includes(key));
  const index=Math.max(0,list.indexOf(guide.step));
  const sectionIndex=Math.max(0,sections.findIndex(([id])=>id===guide.section));
  const fraction=guide.step==='website'?sectionIndex/sections.length:getStep(guide.step)?.micro?(getStep(guide.step).micro.filter(m=>(guide.seen||[]).includes(guide.step+':'+m.key)).length/getStep(guide.step).micro.length):0;
  return Math.min(99,Math.round((index+fraction)/list.length*100));
 }
 function renderLine(s,options){
  return '<progress class="jg-setup-line" max="100" value="'+progressValue(s,options)+'" aria-label="Setup demo progress"></progress>';
 }
 function render(s,options={}){
  const guide=options.guide||defaultState,done=guide.mode==='done',percent=progressValue(s,options);
  if(done&&(guide.dismissed||guide.replayed))return '';
  const label=done&&!guide.skipped?'Replay demo':guide.mode==='paused'&&guide.step?'Resume demo':'Start demo';
  return '<section class="jg-setup-progress" aria-labelledby="jg-setup-title"><div><h2 id="jg-setup-title">'+(done?(guide.skipped?'Setup demo skipped':'Setup demo complete'):'Setup demo')+'</h2><div class="jg-progress-track"><progress max="100" value="'+percent+'" aria-label="Setup demo progress"></progress><span>'+(guide.skipped?'Skipped':percent+'% complete')+'</span></div></div><div class="jg-setup-progress-actions">'+(guide.mode==='active'?'':button(done&&!guide.skipped?'replay-setup-tutorial':'start-setup-tutorial',label,'primary'))+(done?button('dismiss-setup-tutorial','Dismiss','jg-setup-skip'):button('skip-setup-tutorial','Skip demo','jg-setup-skip'))+'</div></section>';
 }
 // One quiet pointer follows the real control. It never blocks input or takes focus.
 function createCue({seen=()=>[],mark=()=>{},advance=()=>{}}={}){
  let flashUntil=0,flashText='',lastMicro='';
  let pointed,frame,typingTarget,typingTimer,dim,ring,shield,advancing='',lastStep='';
  const usedCues=new Set(),visited=new Set();
  const cueAction=element=>element?.dataset.action;
  const dismissibleActions=new Set(['add-category','add-service']);
  const modalOpen=()=>!!document.querySelector('#modal-root .modal,dialog[open]');
  const cueKey=(step,action)=>step+':'+action;
  const modalFields={
   category:[['[name=name]','Category name','Give your category a name, like “Hair” or “Nails”.'],['[name=categoryColor]','Colour','Pick a colour for it. Tap the colour box.'],['button.primary','Save','All set. Tap Add category to save it.']],
   service:[['[name=name]','Service name','What is this service called? For example “Women’s cut”.'],['[name=categoryId]','Category','Tap here and choose which category it belongs to.'],['[name=price]','Price','How much does it cost? Tap here and check the price.'],['[name=duration]','Duration','How long does it take? Tap here and check the minutes.'],['[name=staffIds]','Team','Tick the team members who offer this service.'],['button.primary','Save','Check the right people are ticked under “Offered by”, then tap Save service.']],
   customer:[['[name=name]','Name','Type your customer’s full name.'],['[name=email]','Email','Now type their email address.']]
  };
  const find=(root,selector)=>Array.from(root?.querySelectorAll(selector)||[]).find(el=>{
   const r=el.getBoundingClientRect();
   return r.width>1&&r.height>1&&!el.closest('[hidden],[inert]')&&getComputedStyle(el).visibility==='visible';
  });
  const enabled=el=>!!el&&!el.matches(':disabled');
  const tipCta=()=>document.querySelector('.jg-setup-tip [data-action=setup-continue]');
  const overlayClose=()=>Array.from(document.querySelectorAll('.nf-popover [data-action=notif-close],#modal-root .modal [data-action=close-modal],dialog[open] [data-action=close-modal]')).find(el=>{const r=el.getBoundingClientRect();return r.width>1&&r.height>1&&!el.closest('[hidden]');});
  const asCue=(root,selector,label,text,extra)=>[find(root,selector),label,text,extra];
  const hoursState={toggled:false,edited:false,previewed:false,row:null},touched=new Set();
  function complete(field){
   if(!enabled(field)||field.matches(':invalid')||!field.value.trim())return false;
   if(field.name==='address')return field.value.trim().length>=3;
   if(field.name==='phone')return /^[0-9]{7,15}$/.test(field.value);
   return true;
  }
  function detailsCue(form){
   const mobile=form?.elements.mobileService?.checked;
   const fields=[
    ['name','Business name','Type your business name.'],
    ['address','Address','Add your address. No fixed address? Tick the box under it.'],
    ['phone','Phone','Add your phone number. Numbers only.'],
    ['email','Email','Add your email address.']
   ].map(([name,label,text])=>asCue(form,'[name='+name+']',label,text));
   for(const [field] of fields)if(field){
    field.classList.add('jg-setup-field');
    field.classList.toggle('jg-setup-field-done',complete(field));
   }
   const required=fields.filter(([field])=>enabled(field)&&!(mobile&&field.name==='address'));
   return required.find(([field])=>field===typingTarget&&field===document.activeElement)
    ||required.find(([field])=>!complete(field))
    ||asCue(form,'[data-bd-save]:not(:disabled)','Save','Great. Tap Save to continue.');
  }
  function formCue(form,fields){
   // The category dropdown is a custom control, so point at its visible button.
   const targets=fields.map(([selector,label,text])=>{const cue=asCue(form,selector,label,text);if(!cue[0]&&selector==='[name=categoryId]')cue[0]=find(form,'.jws-select button');return cue;});
   const key=el=>el.name||(el.closest('.jws-select')?'categoryId':'');
   const problem=form.querySelector('.error')?.textContent.trim();
   if(problem&&!typingTarget&&targets[0][0])return [targets[0][0],targets[0][1],problem+' Change it and try again.'];
   const current=targets.find(([el])=>enabled(el)&&el===document.activeElement&&(el===typingTarget||(el.matches('select,button,input[type=color],input[type=checkbox]')&&(form.dataset.form!=='service'||!touched.has(key(el)))&&!(el.name==='categoryColor'&&form.dataset.setupColorSeen))));
   if(current)return current;
   const missing=targets.find(([el])=>enabled(el)&&!complete(el)&&!el.matches('button,input[type=checkbox]'));
   if(missing)return missing;
   if(form.dataset.form==='service'){const review=targets.slice(0,4).find(([el])=>enabled(el)&&!touched.has(key(el)));if(review)return review;}
   if(form.dataset.form==='customer')return asCue(form,'button[type=submit]','Save','Great. Tap Save customer.');
   if(form.dataset.form==='category'&&!form.dataset.setupColorSeen)return targets[1];
   if(form.dataset.form==='service'&&!form.querySelector('[name=staffIds]:checked'))return targets[4];
   return targets.at(-1);
  }
  function target(shell,step){
   if(getStep(step)?.micro){const close=overlayClose();if(close)return [close,'Close'];}
   if(document.querySelector('dialog[open]'))return [];
   const dialog=document.querySelector('#modal-root .modal');
   if(dialog){
    if(dialog.querySelector('[data-unsaved-warning]'))return [];
    const form=dialog.querySelector('[data-form]'),id=form?.dataset.form;
    if((step==='category'&&id==='category')||(step==='services'&&id==='service')||(step==='customers'&&id==='customer'))return formCue(form,modalFields[id]);
    return [];
   }
   const guided=getStep(step);
   if(guided?.micro){const next=currentMicro(step,seen());return next?asCue(shell,next.selector,next.label):[];}
   if(step==='details')return detailsCue(shell.querySelector('[data-form=settings]'));
   if(step==='hours'){
    const box=find(shell,'#business-hours .ws-daily')||find(shell,'#business-hours')||find(shell,'.ws-daily'),save=find(shell,'[data-bd-save]:not(:disabled)');
    // The hours are lit once, as one box. Change whatever you like, then Save.
    if(save)return asCue(shell,'[data-bd-save]:not(:disabled)','Save','Done changing? Tap Save to keep your hours.',box);
    return [box,'Hours','Your opening hours. Happy with them? Tap Skip step. Or change anything you like, then tap Save.'];
   }
   if(step==='website'){
    const websiteForm=shell.querySelector('[data-form=bw-website]');
    const section=shell.querySelector('[data-bw-section]:not([hidden])'),sec=section?.dataset.bwSection;
    const saveText={design:'Nice choice! Tap Save changes.',colours:'Looking good! Change more if you like, then tap Save changes.',hero:'Tap Save changes when you are done.',about:'Tap Save changes when you are done.',search:'Tap Save changes when you are done.'};
    if(websiteForm?.dataset.dirty==='true'&&find(shell,'[data-action=ws-save-personalise]:not(:disabled)'))return asCue(shell,'[data-action=ws-save-personalise]:not(:disabled)','Save changes',saveText[sec]||'Tap Save changes.',section);
    const selection={
     design:['.bw-layout-choice','Design','Tap the design you like best. Happy with yours? Tap Skip step.'],
     colours:['[data-colour-value]','Colour','Pick a brand colour from the swatches. Happy with it? Tap Skip step.'],
     hero:['[name=headline]','Headline','Type the headline clients see first on your website.'],
     about:['[name=about]','About','Write a short welcome for your clients. This is optional.'],
     search:['[name=showInSearch]','Google','Choose if Google can find your website. This is optional.']
    };
    return section&&selection[sec]?asCue(section,...selection[sec]):[];
   }
   if(step==='booking')return hoursState.previewed?[tipCta(),'Continue','Nice! Tap Continue when you are ready.']:asCue(shell,'[data-action=bw-live-booking-preview]','Preview','Tap Preview to see your booking page the way clients see it.');
   return asCue(shell,getStep(step).target,{category:'Add category',services:'Add service'}[step],{category:'Categories group your services, like Hair or Nails. Tap the highlighted Category button.',services:'Now add a service clients can book. Tap the highlighted Add service button.'}[step]);
  }
  function updateJump(shell,el){
   const jump=shell?.querySelector('[data-setup-jump]');
   if(!jump)return;
   const label={name:'Go to business name',address:'Go to address',phone:'Go to phone',email:'Go to email'}[el?.name];
   jump.hidden=!label;
   if(label&&jump.textContent!==label)jump.textContent=label;
  }
  const rounded=(x,y,w,h,r)=>'M'+(x+r)+' '+y+'H'+(x+w-r)+'A'+r+' '+r+' 0 0 1 '+(x+w)+' '+(y+r)+'V'+(y+h-r)+'A'+r+' '+r+' 0 0 1 '+(x+w-r)+' '+(y+h)+'H'+(x+r)+'A'+r+' '+r+' 0 0 1 '+x+' '+(y+h-r)+'V'+(y+r)+'A'+r+' '+r+' 0 0 1 '+(x+r)+' '+y+'Z';
  const overlayOpen=()=>Array.from(document.querySelectorAll('#modal-root .modal,dialog[open],.nf-popover')).some(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return r.width>1&&r.height>1&&c.display!=='none'&&c.visibility!=='hidden'&&!el.closest('[hidden]');});
  // One highlight style everywhere: a rounded cut-out with a soft ring. Everything else is dimmed and blurred.
  function spotlight(step,el,extra){
   const off=()=>{if(dim)dim.hidden=true;if(ring)ring.hidden=true;};
   if(!el)return off();
   let node=el;
   if(step==='website'&&!el.matches('[data-action=ws-save-personalise]'))node=document.querySelector('.shell [data-bw-section]:not([hidden])')||el;
   const r=node.getBoundingClientRect();
   if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return off();
   const pad=8,x=Math.max(4,r.left-pad),y=Math.max(4,r.top-pad),w=Math.min(innerWidth-4,r.right+pad)-x,h=Math.min(innerHeight-4,r.bottom+pad)-y,rad=Math.min(14,Math.round(h/2),Math.round(w/2));
   if(!ring){ring=document.createElement('div');ring.className='jg-setup-ring';ring.setAttribute('aria-hidden','true');document.body.append(ring);}
   ring.hidden=false;
   Object.assign(ring.style,{left:Math.round(x)+'px',top:Math.round(y)+'px',width:Math.round(w)+'px',height:Math.round(h)+'px',borderRadius:rad+'px'});
   if(overlayOpen()||el===tipCta()){if(dim)dim.hidden=true;return;}
   if(!dim){dim=document.createElement('div');dim.className='jg-setup-dim';dim.setAttribute('aria-hidden','true');document.body.append(dim);}
   dim.hidden=false;
   const holes=[rounded(Math.round(x),Math.round(y),Math.round(w),Math.round(h),rad)];
   if(extra){
    const e=extra.getBoundingClientRect();
    if(e.width>2&&e.height>2){
     const ex=Math.max(4,e.left-pad);let ey=Math.max(4,e.top-pad);const ew=Math.min(innerWidth-4,e.right+pad)-ex;let eh=Math.min(innerHeight-4,e.bottom+pad)-ey;
     // Overlapping holes would cancel each other out, so the second area starts where the first one ends.
     if(ey<y+h&&ey+eh>y&&ex<x+w&&ex+ew>x){const cut=y+h-ey;if(cut>0&&cut<eh){ey+=cut;eh-=cut;}}
     holes.push(rounded(Math.round(ex),Math.round(ey),Math.round(ew),Math.round(eh),14));
    }
   }
   dim.style.clipPath="path(evenodd,'M0 0H"+innerWidth+'V'+innerHeight+'H0Z'+holes.join('')+"')";
  }
  // Move on the moment the action is done. A clear shield blocks stray taps while the screen glides.
  function glide(step){
   if(advancing===step)return;
   advancing=step;
   if(!shield){shield=document.createElement('div');shield.className='jg-setup-shield';shield.setAttribute('aria-hidden','true');document.body.append(shield);}
   shield.hidden=false;
   setTimeout(()=>{advance(step);setTimeout(()=>{if(shield)shield.hidden=true;},420);},320);
   setTimeout(()=>{if(advancing===step)advancing='';},1600);
  }
  const detailsDone=shell=>{
   const form=shell.querySelector('[data-form=settings]');if(!form)return false;
   const mobile=form.elements.mobileService?.checked;
   const names=['name','address','phone','email'].filter(n=>!(mobile&&n==='address'));
   return names.every(n=>{const f=form.elements[n];return f&&complete(f);})&&!find(form,'[data-bd-save]:not(:disabled)');
  };
  // Where the guide sits at the bottom, measured even while it is parked at the top.
  function bottomSlot(tip){
   const parked=tip.classList.contains('jg-tip-top');
   if(parked)tip.classList.remove('jg-tip-top');
   const r=tip.getBoundingClientRect();
   if(parked)tip.classList.add('jg-tip-top');
   return r;
  }
  function reserveTipSpace(shell){
   const tip=shell.querySelector('.jg-setup-tip');
   const slot=tip?bottomSlot(tip):null,top=slot?slot.top:innerHeight;
   const space=tip?Math.max(0,innerHeight-top)+28:0;
   if(shell.style.getPropertyValue('--jg-tip-space')!==space+'px')shell.style.setProperty('--jg-tip-space',space+'px');
   return top;
  }
  // Put the guide at the bottom or the top, whichever covers less of what the person is meant to see or tap.
  function placeTip(shell,protect,lookAround){
   const tip=shell?.querySelector('.jg-setup-tip');if(!tip)return;
   const down=bottomSlot(tip),th=tip.offsetHeight,up={left:down.left,right:down.right,top:12,bottom:12+th};
   const rects=[];
   for(const [node,weight] of protect){
    if(!node)continue;
    const r=node.getBoundingClientRect();
    if(r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight)rects.push([r,weight]);
   }
   if(overlayOpen()){
    const panel=document.querySelector('#modal-root .modal');if(panel)rects.push([panel.getBoundingClientRect(),1]);
    // The close button is never covered. Save buttons matter only in forms the person is filling in, not in look-around screens.
    for(const button of document.querySelectorAll('#modal-root .modal [data-action=close-modal],.nf-popover [data-action=notif-close]'))rects.push([button.getBoundingClientRect(),1000]);
    if(!lookAround)for(const button of document.querySelectorAll('#modal-root .modal button[type=submit],#modal-root .modal .btn.primary'))rects.push([button.getBoundingClientRect(),4]);
   }
   const cover=slot=>rects.reduce((sum,[r,weight])=>sum+Math.max(0,Math.min(slot.right,r.right)-Math.max(slot.left,r.left))*Math.max(0,Math.min(slot.bottom,r.bottom)-Math.max(slot.top,r.top))*weight,0);
   tip.classList.toggle('jg-tip-top',cover(up)<cover(down));
  }
  // The area the spotlight lights up: the control itself, or the whole group it belongs to.
  function focusNode(step,el){
   if(step==='website'&&!el.matches('[data-action=ws-save-personalise]'))return document.querySelector('.shell [data-bw-section]:not([hidden])')||el;
   return el;
  }
  function paint(){
   frame=0;
   const shell=document.querySelector('.shell[data-setup-active]'),step=shell?.dataset.setupActive;
   if(!step||!modalOpen()){touched.clear();}
   if(!step){usedCues.clear();visited.clear();hoursState.toggled=false;hoursState.edited=false;hoursState.previewed=false;hoursState.row=null;lastStep='';if(dim)dim.hidden=true;}
   const cueInfo=getStep(step)?target(shell,step):[];
   let el=cueInfo[0];
   if(usedCues.has(cueKey(step,cueAction(el))))el=null;
   const tipTop=shell&&step?reserveTipSpace(shell):innerHeight;
   const changed=pointed!==el;
   if(changed){pointed?.classList.remove('jg-setup-pointed');pointed=el;el?.classList.add('jg-setup-pointed');}
   updateJump(shell,el);
   const guided=getStep(step);
   const cueText=cueInfo[2],cueExtra=cueInfo[3];
   if(shell){
    const tip=shell.querySelector('.jg-setup-tip'),hint=tip?.querySelector('#jg-setup-instruction'),count=tip?.querySelector('.jg-setup-count');
    if(hint){
     hint.dataset.base=hint.dataset.base||hint.textContent;
     const next=guided?.micro?currentMicro(step,seen()):null,open=guided?.micro&&overlayOpen();
     const text=guided?.micro
      ?(open?(guided.micro.find(m=>step+':'+m.key===lastMicro)?.closeText||'Have a look around, then tap the X to continue.'):modalOpen()&&cueText?cueText:next?next.text:doneText(step))
      :(el&&cueText?cueText:hint.dataset.base);
     if(hint.textContent!==text)hint.textContent=text;
     // Open dropdowns need the whole screen, so the guide steps aside until a choice is made.
     tip.classList.toggle('jg-tip-away',Array.from(document.querySelectorAll('#modal-root [aria-expanded=true],.jws-popover')).some(e=>getComputedStyle(e).display!=='none'));
     const over=overlayOpen();
     tip.classList.toggle('jg-tip-over',over);
     document.body.style.setProperty('--jg-tip-h',over?Math.ceil(tip.getBoundingClientRect().height)+'px':'0px');
    }
    if(count){
     count.dataset.base=count.dataset.base||count.textContent;
     const flashing=Date.now()<flashUntil,text=flashing?'✓ '+flashText:count.dataset.base;
     if(count.textContent!==text)count.textContent=text;
     tip.classList.toggle('jg-tip-success',flashing);
    }
   }
   if(step&&advancing&&advancing!==step)advancing='';
   const idle=!overlayOpen();
   if(shell&&idle&&(
    (guided?.micro&&!currentMicro(step,seen()))
    ||(step==='details'&&detailsDone(shell))
   ))glide(step);
   if(!el){placeTip(shell,[],!!guided?.micro);if(dim)dim.hidden=true;if(ring)ring.hidden=true;return;}
   const header=el.closest('.workspace-main')&&shell.querySelector('.workspace-header');
   const top=header?.getBoundingClientRect().bottom||0;
   const node=focusNode(step,el);
   // Bring the whole thing into the clear area between the header and the guide.
   if((changed||lastStep!==step)&&!el.closest('.workspace-header')&&el!==tipCta()){
    const nr=node.getBoundingClientRect(),safeTop=top+10,safeBottom=tipTop-12;
    if(nr.top<safeTop||nr.bottom>safeBottom){
     node.style.scrollMarginTop=safeTop+'px';node.style.scrollMarginBottom=Math.max(0,innerHeight-safeBottom)+'px';
     node.scrollIntoView({block:nr.height<=safeBottom-safeTop?'nearest':'start',behavior:'smooth'});
    }
   }
   lastStep=step;
   placeTip(shell,[[el,100000],[cueExtra,1],[node===el?null:node,1]],!!guided?.micro);
   const r=el.getBoundingClientRect();
   const scroller=el.closest('.jg-panel-body,.workspace-main');
   const clip=scroller?.getBoundingClientRect();
   if(r.bottom<=Math.max(top,clip?.top||0)||r.top>=Math.min(innerHeight,clip?.bottom||innerHeight)){if(dim)dim.hidden=true;if(ring)ring.hidden=true;return;}
   spotlight(step,el,cueExtra);
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(paint);}
  // Saved confirmations appear inside the guide box instead of a toast that clashes with the instructions.
  function flash(text){
   if(!document.querySelector('.shell[data-setup-active]'))return false;
   flashText=({hours:'Working hours saved'}[document.querySelector('.shell[data-setup-active]')?.dataset.setupActive])||text;flashUntil=Date.now()+1400;refresh();
   setTimeout(refresh,1450);
   return true;
  }
  for(const event of ['focusin','focusout','input','change','click','scroll','animationend','toggle'])document.addEventListener(event,e=>{
   if(!pointed&&!document.querySelector('.shell[data-setup-active]'))return;
   if(e.type==='click'&&e.target.closest?.('[data-setup-jump]')&&pointed){
    pointed.scrollIntoView({block:'center',behavior:'instant'});
    pointed.focus({preventScroll:true});
   }
   if(e.type==='click'){
    const step=document.querySelector('.shell[data-setup-active]')?.dataset.setupActive;
    const control=e.target.closest?.('[data-action]'),action=cueAction(control);
    if(step&&dismissibleActions.has(action))usedCues.add(cueKey(step,action));
    const key=action?action+(action==='cal-view'&&control.dataset.value?':'+control.dataset.value:''):'';
    const micro=key&&getStep(step)?.micro?.find(item=>item.key===key);
    if(micro){lastMicro=step+':'+key;}
    if(micro&&!seen().includes(step+':'+key)){mark(step,key);}
   }
   if(['focusin','change','click'].includes(e.type)&&e.target.closest?.('#modal-root')){if(e.target.name)touched.add(e.target.name);if(e.target.closest('.jws-select'))touched.add('categoryId');}
   if(e.type==='focusin'&&e.target.form?.dataset.form==='settings'&&e.target.name)visited.add(e.target.name);
   if(e.type==='click'&&e.target.closest?.('[data-action=ws-save-personalise]')){
    // Backup: once Save has been pressed and the form is clean, move on even if the normal hand-off was missed.
    const here=()=>document.querySelector('[data-bw-section]:not([hidden])')?.dataset.bwSection,was=here();
    setTimeout(()=>{if(document.querySelector('.shell[data-setup-active=website]')&&here()===was&&document.querySelector('[data-form=bw-website]')?.dataset.dirty!=='true')advance('website');},1600);
   }
   if(e.type==='click'&&e.target.closest?.('[data-bd-day-toggle]'))hoursState.toggled=true;
   if(['click','change'].includes(e.type)&&e.target.closest?.('#business-hours .ws-daily-row')&&e.target.closest('[data-bd-day-toggle],[data-bd-hours-edit],input[type=time]'))hoursState.row=e.target.closest('.ws-daily-row');
   if(e.type==='click'&&e.target.closest?.('[data-action=bw-live-booking-preview]'))hoursState.previewed=true;
   if(e.type==='change'&&e.target.matches?.('input[type=time]'))hoursState.edited=true;
   if(e.type==='click'&&e.target.matches('input[name=template]'))e.target.form.dataset.setupDesignReviewed='true';
   if(['change','focusout'].includes(e.type)&&e.target.name==='categoryColor'&&e.target.form)e.target.form.dataset.setupColorSeen='true';
   if(e.type==='input'&&e.target.matches('input:not([type=checkbox]):not([type=radio]),textarea')){
    typingTarget=e.target;
    clearTimeout(typingTimer);
    typingTimer=setTimeout(()=>{typingTarget=null;refresh();},550);
   }
   refresh();
  },true);
  window.addEventListener('resize',refresh);
  // Sheets and forms close without any click, so watch the page itself and never leave the tour waiting.
  new MutationObserver(()=>{if(document.querySelector('.shell[data-setup-active]'))refresh();}).observe(document.body,{childList:true,subtree:true});
  return {refresh,flash};
 }
 window.JovaSetupGuide=Object.freeze({status,render,renderStep,nextStep,resumeStep,getStep,destination,sections,createState,createCue,renderLine,order,currentMicro,skippable});
})();
