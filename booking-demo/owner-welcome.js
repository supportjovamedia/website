/* Offer the demo once to newly registered owners using the existing welcome claim. */
(() => {
 'use strict';
 window.JovaOwnerWelcome={create({directory,visible,identity,offer}){
  const checked=new Set();
  async function check(){
   if(!visible()||document.querySelector('#modal-root .modal'))return;
   const key=identity();
   if(!key||checked.has(key))return;
   checked.add(key);
   if(!directory.remote){offer();return;}
   let result;
   try{result=await directory.claimOwnerWelcome();}catch{return;}
   if(result.ok&&result.show&&visible()&&key===identity()&&!document.querySelector('#modal-root .modal'))offer();
  }
  return {check};
 }};
})();
