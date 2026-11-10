/* Local owner inactivity only. This module never makes a network request. */
(() => {
 'use strict';
 const limit=10*60*1000,writeEvery=15000,prefix='jovabook-owner-activity-v1:';
 window.JovaOwnerIdleSession={create(api){
  let owner=null,activityAt=0,activityMono=0,lastWrite=0,pending=false,timer=null,generation=0,listening=false,intentAt=-Infinity;
  const wall=()=>Date.now(),mono=()=>typeof performance!=='undefined'?performance.now():wall();
  const current=expected=>!!expected&&api.identity()===expected&&api.hasSession();
  function stored(id){
   try{const raw=localStorage.getItem(prefix+id);if(raw===null)return null;const value=JSON.parse(raw);return Number.isFinite(value?.at)&&value.at>0?{at:value.at}: {invalid:true};}catch{return {invalid:true};}
  }
  function expired(id){const value=id&&stored(id);return !!value&&(value.invalid||value.at>wall()+1000||wall()-value.at>=limit);}
  function flush(){
   if(!owner||!pending||!current(owner))return;
   try{localStorage.setItem(prefix+owner,JSON.stringify({at:activityAt}));lastWrite=wall();pending=false;}catch{pending=false;}
  }
  function detach(){
   if(!listening)return;listening=false;
   for(const name of ['pointerdown','keydown','touchstart','scroll'])document.removeEventListener(name,activity,true);
   document.removeEventListener('wheel',scrollIntent,true);document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);window.removeEventListener('storage',storage);
  }
  function stop(){flush();generation++;clearTimeout(timer);timer=null;owner=null;pending=false;intentAt=-Infinity;detach();}
  function accept(at){activityAt=at;activityMono=mono()-Math.max(0,wall()-at);}
  function elapsed(){return Math.max(0,wall()-activityAt,mono()-activityMono);}
  function schedule(){
   clearTimeout(timer);timer=null;if(!owner)return;
   const expected=owner,version=generation,remaining=Math.max(0,limit-elapsed()),flushIn=pending?Math.max(0,writeEvery-(wall()-lastWrite)):Infinity;
   timer=setTimeout(()=>{timer=null;if(version!==generation||owner!==expected)return;check();},Math.min(remaining,flushIn));
  }
  function check(){
   if(!owner)return;const expected=owner;
   if(!current(expected)||!api.liveActive()){stop();return;}
   const value=stored(expected);
   if(value&&!value.invalid&&value.at<=wall()+1000&&value.at>activityAt)accept(value.at);
   if(value?.invalid||value?.at>wall()+1000||elapsed()>=limit){
    pending=false;stop();if(current(expected))try{void Promise.resolve(api.expire(expected)).catch(()=>{});}catch{}return;
   }
   if(pending&&wall()-lastWrite>=writeEvery)flush();schedule();
  }
  function scrollIntent(event){if(event.isTrusted&&!document.hidden)intentAt=mono();}
  function activity(event){
   if(!event.isTrusted||document.hidden||!owner||!current(owner)||!api.liveActive())return;
   if(event.type==='scroll'&&mono()-intentAt>2000)return;
   if(event.type!=='scroll')intentAt=mono();
   // A late interaction cannot silently revive an already-expired saved session.
   check();if(!owner)return;
   accept(wall());pending=true;if(wall()-lastWrite>=writeEvery)flush();schedule();
  }
  function storage(event){if(owner&&event.key===prefix+owner)check();}
  function attach(){
   if(listening)return;listening=true;
   for(const name of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(name,activity,{capture:true,passive:true});
   document.addEventListener('wheel',scrollIntent,{capture:true,passive:true});document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);window.addEventListener('storage',storage);
  }
  function start({interactive=false}={}){
   const identity=api.identity();if(!current(identity)){stop();return;}
   if(interactive){stop();owner=identity;accept(wall());pending=true;lastWrite=0;flush();}
   if(!api.liveActive()){stop();return;}
   if(owner!==identity){stop();owner=identity;const value=stored(identity);if(value?.invalid||expired(identity)){check();return;}accept(value?.at||wall());lastWrite=wall();if(!value){pending=true;flush();}}
   attach();check();
  }
  return {start,stop,expired};
 }};
})();
