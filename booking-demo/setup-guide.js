/* Guided setup uses saved business data and a per-business browser checkpoint. */
(() => {
 'use strict';
 const steps=[
  {id:'details',title:'Business information',route:'settings',target:'[name=name]',text:'Check your business name and contact details, then select Save. Mobile services can leave the address blank.'},
  {id:'hours',title:'Working hours',route:'availability',target:'.ws-daily-row',text:'Choose the days and times clients can book, then select Save.'},
  {id:'category',title:'Add a service category',route:'services',target:'[data-action="add-category"]',text:'Select the highlighted Category button. Give it a name, choose a color, then select Add category.'},
  {id:'services',title:'Add a service',route:'services',target:'[data-action="add-service"]',text:'Select the highlighted Add service button. Enter the name, category, price and duration, then confirm who offers it.'},
  {id:'website',title:'Set up your website',route:'scheduling',target:'[data-bw-section]:not([hidden])',text:'Choose how your website looks and what clients see.'},
  {id:'booking',title:'Booking page',route:'booking-setup',target:'.bw-settings-intro',text:'Clients choose a service and time here. You can change the welcome message and appearance, copy links to individual services, or share the direct booking link.'},
  {id:'share',title:'Your dashboard',route:'dashboard',target:'.workspace-header [data-action="share-booking-link"]',text:'Use Share links at the top right to copy your website or direct booking link. The bell shows notifications, and the palette changes your workspace theme.'},
  {id:'bookings',title:'Bookings',route:'bookings',target:'[data-action="bookings-filters"]',text:'Find your appointments here. Use the filters to narrow the list by status, service or team member. You can also manage bookings with multiple sessions.'},
  {id:'calendar',title:'Calendar',route:'calendar',target:'.db-period-controls',text:'Switch between Day, Week and Month to see your schedule at different levels. Try the views whenever you like.'},
  {id:'customers',title:'Customers',route:'customers',target:'[data-action="add-customer"]',text:'Find client details and booking history here. Add customer opens the form. You can look around and close it when you are ready.'}
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
 const defaultState={mode:'new',step:'',section:'design',websiteReviewed:false,skipped:false,waived:[]};
 function createState(storage){
  const memory=new Map();
  const key=(owner,business)=>'jovabook-setup-guide-v2:'+JSON.stringify([owner,business]);
  function read(owner,business){
   const id=key(owner,business);let stored=memory.get(id);
   if(!stored){try{stored=JSON.parse(storage?.getItem(id)||'null');}catch{}}
   const valid=stored&&['paused','active','done'].includes(stored.mode);
   if(!valid)return {...defaultState};
   return {mode:stored.mode,step:getStep(stored.step)?.id||'',section:sections.some(([id])=>id===stored.section)?stored.section:'design',websiteReviewed:stored.websiteReviewed===true,skipped:stored.skipped===true,waived:Array.isArray(stored.waived)?stored.waived.filter(id=>steps.slice(0,5).some(step=>step.id===id)):[]};
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
   booking:button('setup-continue','Continue to sharing','primary'),
   share:button('setup-continue','Continue to bookings','primary'),
   bookings:button('setup-continue','Continue to calendar','primary'),
   calendar:button('setup-continue','Continue to customers','primary'),
   customers:button('setup-finish','Finish demo','primary')
  };
  const skip=['details','hours','category','services'].includes(id)?button('setup-skip-step','Skip this step'):'';
  return '<aside class="jg-setup-tip" aria-label="Setup guide"><div><span class="jg-setup-position">Setup demo</span><strong>'+step.title+'</strong><p id="jg-setup-instruction">'+(id==='website'?section[1]:step.text)+'</p></div><div class="jg-setup-tip-actions">'+(actions[id]||'')+skip+button('setup-pause','Exit demo')+'</div></aside>';
 }
 function render(s,options={}){
  const progress=status(s,options),guide=options.guide||defaultState,done=guide.mode==='done';
  const stepIndex=steps.findIndex(step=>step.id===guide.step);
  const reviewed=stepIndex<5?0:stepIndex-5;
  const websiteFraction=guide.step==='website'&&!progress.tasks[4].covered?Math.max(0,sections.findIndex(([id])=>id===guide.section))/sections.length:0;
  const percent=done?100:Math.round((progress.completed+reviewed+websiteFraction)/steps.length*100);
  const label=done&&!guide.skipped?'Replay demo':guide.mode==='paused'&&guide.step?'Resume demo':'Start demo';
  return '<section class="jg-setup-progress" aria-labelledby="jg-setup-title"><div><h2 id="jg-setup-title">'+(done?(guide.skipped?'Setup demo skipped':'Setup demo complete'):'Setup demo')+'</h2><div class="jg-progress-track"><progress max="100" value="'+percent+'" aria-label="Setup demo progress"></progress><span>'+(guide.skipped?'Skipped':percent+'% complete')+'</span></div></div><div class="jg-setup-progress-actions">'+(guide.mode==='active'?'':button('start-setup-tutorial',label,'primary'))+(done?'':button('skip-setup-tutorial','Skip demo','jg-setup-skip'))+'</div></section>';
 }
 window.JovaSetupGuide=Object.freeze({status,render,renderStep,nextStep,resumeStep,getStep,destination,sections,createState});
})();
