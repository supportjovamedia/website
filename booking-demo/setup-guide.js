/* Guided setup uses saved business data and a per-business browser checkpoint. */
(() => {
 'use strict';
 const steps=[
  {id:'details',title:'Business information',route:'settings',target:'[name=name]',text:'Check your business details. If you have no fixed address, use the checkbox under Address.'},
  {id:'hours',title:'Working hours',route:'availability',target:'.ws-daily-row',text:'Choose the days and times clients can book, then select Save.'},
  {id:'category',title:'Add a service category',route:'services',target:'[data-action="add-category"]',text:'Select the highlighted Category button. Give it a name, choose a color, then select Add category.'},
  {id:'services',title:'Add a service',route:'services',target:'[data-action="add-service"]',text:'Select the highlighted Add service button. Enter the name, category, price and duration, then confirm who offers it.'},
  {id:'website',title:'Set up your website',route:'scheduling',target:'[data-bw-section]:not([hidden])',text:'Choose how your website looks and what clients see.'},
  {id:'booking',title:'Booking page',route:'booking-setup',target:'.bw-settings-intro',text:'Review how clients see your booking page. Continue when you’re ready.'},
  {id:'share',title:'Your dashboard',route:'dashboard',target:'.workspace-header [data-action="workspace-appearance"]',text:'The palette changes your workspace theme. The bell shows notifications, and Share links opens your website and booking links.'},
  {id:'bookings',title:'Bookings',route:'bookings',target:'[data-action="bookings-filters"]',text:'Find your appointments here. Use the filters to narrow the list by status, service or team member. You can also manage bookings with multiple sessions.'},
  {id:'calendar',title:'Calendar',route:'calendar',target:'.db-period-controls',text:'Switch between Day, Week and Month to see your schedule at different levels. Try the views whenever you like.'},
  {id:'customers',title:'Customers',route:'customers',target:'[data-action="add-customer"]',text:'Add a customer and save, or choose Cancel to leave the form. You can delete a saved customer from their record.'}
 ];
 const sections=[
  ['design','Choose a website design. Save a new choice or continue with the current one.'],
  ['colours','Choose colors for buttons and headings, or keep the defaults.'],
  ['hero','Check the headline at the top of your website. A logo and banner image are optional.'],
  ['about','Add a short introduction if you would like clients to know more about your business.'],
  ['search','Choose whether Google can find your website and whether to hide your street address. Both choices are optional.']
 ];
 const getStep=id=>steps.find(step=>step.id===id);
 const destination=id=>{const step=getStep(id);return step?step.route+'?setup='+step.id:'dashboard';};
 const defaultState={mode:'new',step:'',section:'design',websiteReviewed:false,skipped:false,replayed:false,dismissed:false,waived:[]};
 function createState(storage){
  const memory=new Map();
  const key=(owner,business)=>'jovabook-setup-guide-v2:'+JSON.stringify([owner,business]);
  function read(owner,business){
   const id=key(owner,business);let stored=memory.get(id);
   if(!stored){try{stored=JSON.parse(storage?.getItem(id)||'null');}catch{}}
   const valid=stored&&['paused','active','done'].includes(stored.mode);
   if(!valid)return {...defaultState};
   return {mode:stored.mode,step:getStep(stored.step)?.id||'',section:sections.some(([id])=>id===stored.section)?stored.section:'design',websiteReviewed:stored.websiteReviewed===true,skipped:stored.skipped===true,replayed:stored.replayed===true,dismissed:stored.dismissed===true,waived:Array.isArray(stored.waived)?stored.waived.filter(id=>steps.slice(0,5).some(step=>step.id===id)):[]};
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
  const tasks=steps.slice(0,5).map(step=>({...step,done:complete[step.id],covered:complete[step.id]||(guide.waived||[]).includes(step.id)}));
  return {tasks,completed:tasks.filter(task=>task.covered).length,total:tasks.length,ready:tasks.every(task=>task.done)};
 }
 function nextStep(s,options){return status(s,options).tasks.find(task=>!task.covered)||getStep('booking');}
 function resumeStep(s,options){
  const saved=getStep(options.guide?.step);
  const next=nextStep(s,options);
  if(saved?.id==='website'&&next.id==='booking')return saved;
  if(saved&&steps.indexOf(saved)>=steps.indexOf(getStep('booking'))&&next.id==='booking')return saved;
  return next;
 }
 const button=(action,label,kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+action+'">'+label+'</button>';
 function renderStep(s,options,id){
  const step=getStep(id);if(!step)return '';
  const guide=options.guide||defaultState;
  const section=sections.find(([key])=>key===guide.section)||sections[0];
  const actions={
   website:button('setup-continue',guide.section==='search'?'Continue to booking page':'Continue','primary'),
   booking:button('setup-continue','Continue to dashboard','primary'),
   share:button('setup-continue','Continue to bookings','primary'),
   bookings:button('setup-continue','Continue to calendar','primary'),
   calendar:button('setup-continue','Continue to customers','primary'),
   customers:button('setup-finish','Finish demo','primary')
  };
  const jump=id==='details'?'<button type="button" class="jg-setup-jump" data-setup-jump>Go to required field</button>':'';
  const skip=['details','hours','category','services'].includes(id)?button('setup-skip-step','Skip this step','primary'):'';
  return '<aside class="jg-setup-tip" aria-label="Setup guide"><div><p id="jg-setup-instruction">'+(id==='website'?section[1]:step.text)+'</p>'+jump+'</div><div class="jg-setup-tip-actions">'+(actions[id]||'')+skip+button('setup-pause','Exit demo')+'</div></aside>';
 }
 function progressValue(s,options){
  const progress=status(s,options),guide=options.guide||defaultState,done=guide.mode==='done';
  const stepIndex=steps.findIndex(step=>step.id===guide.step);
  const reviewed=stepIndex<5?0:stepIndex-5;
  const websiteFraction=guide.step==='website'&&!progress.tasks[4].covered?Math.max(0,sections.findIndex(([id])=>id===guide.section))/sections.length:0;
  return done?100:Math.round((progress.completed+reviewed+websiteFraction)/steps.length*100);
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
 function createCue(){
  let badge,pointed,frame,typingTarget,typingTimer;
  const usedCues=new Set();
  const cueAction=element=>element?.dataset.action;
  const dismissibleActions=new Set(['add-category','add-service','workspace-appearance','share-booking-link','bookings-filters','cal-view','add-customer','ws-copy']);
  const cueKey=(step,action)=>step+':'+action;
  const modalFields={
   category:[['[name=name]','Name the category'],['[name=categoryColor]','Choose a color'],['button.primary','Save']],
   service:[['[name=name]','Name the service'],['[name=categoryId]','Choose a category'],['[name=price]','Enter the price'],['[name=duration]','Enter the duration'],['[name=staffIds]','Choose who offers it'],['button.primary','Save']],
   customer:[['[name=name]','Enter the name'],['[name=email]','Enter an email address']]
  };
  const find=(root,selector)=>Array.from(root?.querySelectorAll(selector)||[]).find(el=>{
   const r=el.getBoundingClientRect();
   return r.width>1&&r.height>1&&!el.closest('[hidden],[inert]')&&getComputedStyle(el).visibility==='visible';
  });
  const enabled=el=>!!el&&!el.matches(':disabled');
  const asCue=(root,selector,label)=>[find(root,selector),label];
  function complete(field){
   if(!enabled(field)||field.matches(':invalid')||!field.value.trim())return false;
   if(field.name==='address')return field.value.trim().length>=3;
   if(field.name==='phone')return /^[0-9]{7,15}$/.test(field.value);
   return true;
  }
  function detailsCue(form){
   const mobile=form?.elements.mobileService?.checked;
   const fields=[
    ['name','Enter business name'],
    ['address','Enter your address'],
    ['phone','Enter your phone'],
    ['email','Enter your email']
   ].map(([name,label])=>asCue(form,'[name='+name+']',label));
   for(const [field] of fields)if(field){
    field.classList.add('jg-setup-field');
    field.classList.toggle('jg-setup-field-done',complete(field));
   }
   const required=fields.filter(([field])=>enabled(field)&&!(mobile&&field.name==='address'));
   return required.find(([field])=>field===typingTarget&&field===document.activeElement)
    ||required.find(([field])=>!complete(field))
    ||asCue(form,'[data-bd-save]:not(:disabled)','Save details');
  }
  function formCue(form,fields){
   const targets=fields.map(([selector,label])=>asCue(form,selector,label));
   const current=targets.find(([el])=>enabled(el)&&el===document.activeElement&&(el===typingTarget||el.matches('select,button,input[type=color],input[type=checkbox]')));
   if(current)return current;
   const missing=targets.find(([el])=>enabled(el)&&!complete(el)&&!el.matches('button,input[type=checkbox]'));
   if(missing)return missing;
   if(form.dataset.form==='customer')return asCue(form,'button[type=submit]','Save customer');
   if(form.dataset.form==='category'&&!form.dataset.setupColorSeen)return targets[1];
   if(form.dataset.form==='service'&&!form.querySelector('[name=staffIds]:checked'))return targets[4];
   return targets.at(-1);
  }
  function target(shell,step){
   if(document.querySelector('dialog[open]'))return [];
   const dialog=document.querySelector('#modal-root .modal');
   if(dialog){
    if(dialog.querySelector('[data-unsaved-warning]'))return [];
    const form=dialog.querySelector('[data-form]'),id=form?.dataset.form;
    if((step==='category'&&id==='category')||(step==='services'&&id==='service')||(step==='customers'&&id==='customer'))return formCue(form,modalFields[id]);
    return [];
   }
   if(step==='details')return detailsCue(shell.querySelector('[data-form=settings]'));
   if(step==='hours')return shell.querySelector('.bd-day-toggle[aria-checked=true]')&&find(shell,'[data-bd-save]:not(:disabled)')
    ?asCue(shell,'[data-bd-save]:not(:disabled)','Save')
    :asCue(shell,'.bd-day-toggle','Set opening hours');
   if(step==='website'){
    const websiteForm=shell.querySelector('[data-form=bw-website]');
    if(websiteForm?.dataset.dirty==='true')return asCue(shell,'[data-action=ws-save-personalise]','Save changes');
    if(websiteForm?.dataset.setupDesignReviewed==='true'&&shell.querySelector('[data-bw-view=design]'))return asCue(shell,'[data-action=setup-continue]','Continue');
    const section=shell.querySelector('[data-bw-section]:not([hidden])');
    const selection={design:['.bw-layout-choice','Choose a design'],colours:['[data-colour-value]','Choose a color'],hero:['[name=headline]','Type here'],about:['[name=about]','Type here'],search:['[name=showInSearch]','Optional']};
    return section&&selection[section.dataset.bwSection]?asCue(section,...selection[section.dataset.bwSection]):[];
   }
   if(step==='booking')return [];
   if(step==='calendar')return asCue(shell,'[data-action=cal-view][data-value=week]','Try Week view');
   return asCue(shell,getStep(step).target,{category:'Add category',services:'Add service',share:'Workspace theme',bookings:'Try filters',customers:'Add customer'}[step]);
  }
  function updateJump(shell,el){
   const jump=shell?.querySelector('[data-setup-jump]');
   if(!jump)return;
   const label={name:'Go to business name',address:'Go to address',phone:'Go to phone',email:'Go to email'}[el?.name];
   jump.hidden=!label;
   if(label&&jump.textContent!==label)jump.textContent=label;
  }
  function paint(){
   frame=0;
   const shell=document.querySelector('.shell[data-setup-active]'),step=shell?.dataset.setupActive;
   if(!step)usedCues.clear();
   let [el,label]=getStep(step)?target(shell,step):[];
   if(usedCues.has(cueKey(step,cueAction(el))))el=null;
   if(pointed!==el){pointed?.classList.remove('jg-setup-pointed');pointed=el;el?.classList.add('jg-setup-pointed');}
   updateJump(shell,el);
   if(step==='website'&&shell.querySelector('[data-bw-view=design]')){
    const hint=shell.querySelector('#jg-setup-instruction');
    const guidance=el?.matches('[data-action=ws-save-personalise]')?'Design selected. Save changes to continue.':el?.matches('[data-action=setup-continue]')?'This design is already selected. Continue when you’re ready.':sections[0][1];
    if(hint&&hint.textContent!==guidance)hint.textContent=guidance;
   }
   if(!el){if(badge)badge.hidden=true;return;}
   const r=el.getBoundingClientRect(),header=el.closest('.workspace-main')&&shell.querySelector('.workspace-header');
   const top=header?.getBoundingClientRect().bottom||0;
   const scroller=el.closest('.jg-panel-body,.workspace-main');
   const clip=scroller?.getBoundingClientRect();
   if(r.bottom<=Math.max(top,clip?.top||0)||r.top>=Math.min(innerHeight,clip?.bottom||innerHeight)){if(badge)badge.hidden=true;return;}
   if(!badge){
    badge=document.createElement('div');badge.className='jg-setup-cue';badge.setAttribute('aria-hidden','true');
    document.body.append(badge);
   }
   const below=el.matches('[data-bd-save],[data-action=ws-save-personalise]');
   badge.textContent=below?'↑':label||'';
   badge.classList.toggle('jg-setup-cue-arrow',below);
   badge.dataset.placement=below?'below':'above';
   badge.hidden=false;
   const width=badge.offsetWidth,anchor=below?r.left+(r.width-width)/2:r.right-width;
   const x=Math.max(6,Math.min(innerWidth-width-6,anchor));
   badge.style.left=x+'px';
   badge.style.top=(below?r.bottom+8:Math.max(5,top,r.top-badge.offsetHeight-7))+'px';
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(paint);}
  for(const event of ['focusin','input','change','click','scroll','animationend','toggle'])document.addEventListener(event,e=>{
   if(!pointed&&!document.querySelector('.shell[data-setup-active]'))return;
   if(e.type==='click'&&e.target.closest?.('[data-setup-jump]')&&pointed){
    pointed.scrollIntoView({block:'center',behavior:'instant'});
    pointed.focus({preventScroll:true});
   }
   if(e.type==='click'){
    const step=document.querySelector('.shell[data-setup-active]')?.dataset.setupActive;
    const action=cueAction(e.target.closest?.('[data-action]'));
    if(step&&dismissibleActions.has(action))usedCues.add(cueKey(step,action));
   }
   if(e.type==='click'&&e.target.matches('input[name=template]'))e.target.form.dataset.setupDesignReviewed='true';
   if(e.type==='change'&&e.target.name==='categoryColor'&&e.target.form)e.target.form.dataset.setupColorSeen='true';
   if(e.type==='input'&&e.target.matches('input:not([type=checkbox]):not([type=radio]),textarea')){
    typingTarget=e.target;
    clearTimeout(typingTimer);
    typingTimer=setTimeout(()=>{typingTarget=null;refresh();},550);
   }
   refresh();
  },true);
  window.addEventListener('resize',refresh);
  return {refresh};
 }
 window.JovaSetupGuide=Object.freeze({status,render,renderStep,nextStep,resumeStep,getStep,destination,sections,createState,createCue,renderLine});
})();
