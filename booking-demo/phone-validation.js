/* Shared contact validation. SMS has separate mobile rules. */
(function(root){
 'use strict';
 const message='Enter a phone number with 7 to 15 digits, using only spaces, brackets, hyphens and an optional leading +, or leave it blank.';
 function valid(value){const phone=String(value??'').trim(),digits=(phone.match(/[0-9]/g)||[]).length;return phone===''||phone.length<=40&&/^\+?[0-9 ()-]+$/.test(phone)&&digits>=7&&digits<=15;}
 const api={valid,message};root.JovaPhone=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
