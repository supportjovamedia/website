/* Only new owners with a successful, once-per-account claim enter setup automatically. */
(() => {
 'use strict';
 window.JovaOwnerWelcome={create({directory,visible,startSetup}){
  const checked=new Set();
  async function check(){
   if(!visible()||!directory.remote||document.querySelector('#modal-root .modal'))return;
   const identity=directory.sessionIdentity();
   if(!identity||checked.has(identity))return;
   checked.add(identity);
   let result;
   try{result=await directory.claimOwnerWelcome();}catch{return;}
   if(result.ok&&result.show&&visible()&&identity===directory.sessionIdentity()&&!document.querySelector('#modal-root .modal'))startSetup();
  }
  return {check};
 }};
})();
