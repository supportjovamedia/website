/* Setup progress comes from saved business data, never a browser-only checklist. */
(() => {
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(s,{bookable=service=>(service.staffIds||[]).some(id=>(s.staff||[]).some(member=>member.id===id&&member.active!==false)),hasHours}={}){
  const hours=s.hours||{},time=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const working=typeof hasHours==='boolean'?hasHours:Array.isArray(hours.days)&&hours.days.some(day=>Number.isInteger(day)&&day>=0&&day<=6)&&time(hours.start)&&time(hours.end)&&hours.end>hours.start;
  const website=s.workspace?.website||{};
  const tasks=[
   {id:'services',title:'Add your first service',description:'Choose what clients can book, with a price and duration.',done:(s.services||[]).some(bookable),action:'setup-service',href:'#services?setup=services',label:'Add a service'},
   {id:'hours',title:'Set your available times',description:'Choose the days and hours you take appointments.',done:working,href:'#availability?setup=hours',label:'Set availability'},
   {id:'details',title:'Introduce your business',description:'Tell clients what you do and add an address if they visit you.',done:!!String(s.about||'').trim(),href:'#settings?setup=details',label:'Add business details'},
   {id:'website',title:'Set up your website',description:'Add a headline, photo or description for your clients.',done:[website.headline,website.heroImage,website.about,website.homeIntro].some(value=>!!String(value||'').trim()),action:'setup-website',label:'Set up your website'}
  ];
  return {tasks,completed:tasks.filter(task=>task.done).length,total:tasks.length,ready:tasks.every(task=>task.done)};
 }
 const shareStep={id:'share',title:'Share your links',href:'#dashboard?setup=share'};
 const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
 function guideButton(task,label){
  return task.action&&!task.href?`<button type="button" class="btn" data-action="${task.action}">${esc(label)}</button>`:`<a class="btn" href="${task.href}">${esc(label)}</a>`;
 }
 function nextStep(s,options){return status(s,options).tasks.find(task=>!task.done)||shareStep;}
 function renderStep(s,options,step){
  const {tasks}=status(s,options),steps=[...tasks,shareStep];
  const index=steps.findIndex(task=>task.id===step);
  if(index<0)return '';
  const current=steps[index];
  const instructions={services:'Add a name, price and duration. Choose who offers the service, then save it.',hours:'Choose when clients can book, then select Save.',details:'Add a short description. Include an address if clients visit you, then select Save.',website:'Choose a layout and add your headline, description or photo. Select Save changes when you’re ready.',share:'Use Share links here or in the dashboard header whenever you need to copy either link.'};
  const next=current.done?nextStep(s,options):null;
  const action=next?guideButton(next,'Next: '+next.title):step==='share'?'<button type="button" class="btn primary" data-action="share-booking-link">Share links</button>':step==='services'?'<button type="button" class="btn primary" data-action="setup-service">Add a service</button>':'';
  return `<aside class="jg-setup-tip" aria-label="Setup guide"><div><span class="jg-setup-position">Step ${index+1} of ${steps.length}</span><strong>${esc(current.title)}</strong><p>${esc(next?'Saved. Continue when you’re ready.':instructions[step])}</p></div><div class="jg-setup-tip-actions">${action}<a href="#dashboard">${step==='share'?'Finish setup':'Back to dashboard'}</a></div></aside>`;
 }
 const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
 function render(s,options){
  const progress=status(s,options);if(progress.ready)return '';
  const next=progress.tasks.find(task=>!task.done);
  const row=(task,index)=>{
   const body=`<span class="jg-step-mark" aria-hidden="true">${task.done?check:index+1}</span><span class="jg-step-copy"><strong>${esc(task.title)}</strong><span class="jg-step-description">${esc(task.description)}</span></span><span class="jg-step-chevron" aria-hidden="true">${chevron}</span>`;
   const label=task.done?({services:'Manage services',hours:'Edit available times',details:'Edit business details',website:'Edit website'}[task.id]):task.label;
   return task.action&&(!task.done||!task.href)?`<button type="button" class="jg-setup-action" data-action="${task.action}" aria-label="${esc(label)}">${body}</button>`:`<a class="jg-setup-action" href="${task.id==='services'?'#services':task.href}" aria-label="${esc(label)}">${body}</a>`;
  };
  return `<section class="jg-setup" aria-labelledby="jg-setup-title"><div class="jg-setup-intro"><h2 id="jg-setup-title">Get set up and start taking bookings</h2><p>Complete a few quick steps to get your website and booking page ready.</p><button type="button" class="btn primary jg-setup-start" data-action="start-setup-tutorial">${progress.completed?'Continue setup':'Start setup'}</button><div class="jg-progress-label"><span>${progress.completed} of ${progress.total} complete</span><span>${Math.round(progress.completed/progress.total*100)}%</span></div><progress max="${progress.total}" value="${progress.completed}" aria-label="Booking page setup">${progress.completed} of ${progress.total}</progress></div><ol class="jg-setup-list">${progress.tasks.map((task,i)=>`<li class="${task.done?'is-done':task.id===next.id?'is-next':''}">${row(task,i)}</li>`).join('')}</ol></section>`;
 }
 window.JovaSetupGuide=Object.freeze({status,render,renderStep,nextStep});
})();
