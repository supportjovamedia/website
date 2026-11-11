/* Shared validation for personal names and email addresses. */
(function (root) {
 'use strict';
 const letters=String.raw`(?:\p{L}\p{M}*)+`;
 const namePattern=' *'+letters+'(?: +'+letters+')* *';
 const emailPattern=String.raw`[^\s@<>]+@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}`;
 const nameRule=new RegExp('^'+namePattern+'$','u');
 const emailRule=new RegExp('^'+emailPattern+'$');
 const nameMessage='Use letters and spaces only.';
 const emailMessage='Enter an email address with a domain, such as name@example.com.';
 const attributes=(pattern,message)=>'pattern="'+pattern.replaceAll('<','&lt;').replaceAll('>','&gt;')+'" title="'+message+'"';
 const api={
  name:value=>nameRule.test(String(value??'')),
  email:value=>emailRule.test(String(value??'').trim()),
  nameMessage,emailMessage,namePattern,emailPattern,
  nameAttributes:attributes(namePattern,nameMessage),
  emailAttributes:attributes(emailPattern,emailMessage)
 };
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.JovaContactValidation=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
