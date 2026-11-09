/* Setup progress comes from saved business data, never a browser-only checklist. */
(() => {
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(s,{bookable=service=>(service.staffIds||[]).some(id=>(s.staff||[]).some(member=>member.id===id&&member.active!==false)),hasHours}={}){
  const hours=s.hours||{},time=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const working=typeof hasHours==='boolean'?hasHours:Array.isArray(hours.days)&&hours.days.some(day=>Number.isInteger(day)&&day>=0&&day<=6)&&time(hours.start)&&time(hours.end)&&hours.end>hours.start;
  const tasks=[
   {id:'services',title:'Add your first service',description:'Choose what clients can book, with a price and duration.',done:(s.services||[]).some(bookable),action:'setup-service',label:'Add a service'},
   {id:'hours',title:'Set your available times',description:'Choose the days and hours you take appointments.',done:working,href:'#availability',label:'Set availability'},
   {id:'details',title:'Introduce your business',description:'Add a description, contact number or address.',done:!!String(s.name||'').trim()&&[s.about,s.phone,s.address].some(value=>!!String(value||'').trim()),href:'#settings',label:'Add business details'}
  ];
  return {tasks,completed:tasks.filter(task=>task.done).length,total:tasks.length,ready:tasks.every(task=>task.done)};
 }
 const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
 const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
 function render(s,options){
  const progress=status(s,options);if(progress.ready)return '';
  const next=progress.tasks.find(task=>!task.done);
  const row=(task,index)=>{
   const body=`<span class="jg-step-mark" aria-hidden="true">${task.done?check:index+1}</span><span class="jg-step-copy"><strong>${esc(task.title)}</strong><span class="jg-step-description">${esc(task.description)}</span></span><span class="jg-step-chevron" aria-hidden="true">${chevron}</span>`;
   const label=task.done?({services:'Manage services',hours:'Edit available times',details:'Edit business details'}[task.id]):task.label;
   return task.action&&!task.done?`<button type="button" class="jg-setup-action" data-action="${task.action}" aria-label="${esc(label)}">${body}</button>`:`<a class="jg-setup-action" href="${task.href||(task.id==='services'?'#services':'#settings')}" aria-label="${esc(label)}">${body}</a>`;
  };
  return `<section class="jg-setup" aria-labelledby="jg-setup-title"><div class="jg-setup-intro"><h2 id="jg-setup-title">Get set up and start taking bookings</h2><p>Complete a few quick steps to get your booking page live.</p><div class="jg-progress-label"><span>${progress.completed} of ${progress.total} complete</span><span>${Math.round(progress.completed/progress.total*100)}%</span></div><progress max="${progress.total}" value="${progress.completed}" aria-label="Booking page setup">${progress.completed} of ${progress.total}</progress></div><ol class="jg-setup-list">${progress.tasks.map((task,i)=>`<li class="${task.done?'is-done':task.id===next.id?'is-next':''}">${row(task,i)}</li>`).join('')}</ol></section>`;
 }
 window.JovaSetupGuide=Object.freeze({status,render});
})();
