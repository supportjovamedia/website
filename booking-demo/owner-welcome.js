/* An atomic account claim makes this welcome a once-only moment across browsers. */
(() => {
 'use strict';
 window.JovaOwnerWelcome={create({directory,visible}){
  const checked=new Set();let dialog=null;
  async function check(){
   if(!visible()||!directory.remote||document.querySelector('#modal-root .modal'))return;
   const identity=directory.sessionIdentity();if(!identity||checked.has(identity))return;checked.add(identity);
   let result;try{result=await directory.claimOwnerWelcome();}catch{return;}
   if(!result.ok||!result.show||!visible()||identity!==directory.sessionIdentity())return;
   dialog?.remove();dialog=document.createElement('dialog');dialog.className='ob-dashboard-welcome';
   dialog.setAttribute('aria-labelledby','ob-welcome-title');dialog.setAttribute('aria-describedby','ob-welcome-description');
   dialog.innerHTML='<div class="ob-welcome-art" aria-hidden="true"><span>j</span><strong>JovaBook.</strong></div><button type="button" class="ob-welcome-close" aria-label="Close welcome"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="ob-welcome-body"><h2 id="ob-welcome-title">Welcome to JovaBook.</h2><p id="ob-welcome-description">Your business, all in one place. Add a service, set your available times and personalise your website. Then you can share your links.</p><button type="button" class="ob-welcome-start" autofocus>Start setup</button></div>';
   dialog.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>dialog.close()));
   dialog.querySelector('.ob-welcome-start').addEventListener('click',()=>{
    (document.querySelector('.jg-setup-list .is-next .jg-setup-action')||document.querySelector('.rf-dashboard-actions button'))?.focus();
   });
   dialog.addEventListener('close',()=>{dialog?.remove();dialog=null;});document.body.append(dialog);dialog.showModal();
  }
  function leave(){if(dialog&&(!visible()||!directory.sessionIdentity()))dialog.close();}
  return {check,leave};
 }};
})();
