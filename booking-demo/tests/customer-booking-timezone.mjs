import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const localeSource=await readFile(new URL('../business-locale.js',import.meta.url),'utf8');
const appSource=await readFile(new URL('../app.js',import.meta.url),'utf8');
const extract=name=>{const start=appSource.indexOf('function '+name+'(');return appSource.slice(start,appSource.indexOf('\nfunction ',start+1));};

test('customer confirmation and manage page show business timezone for live and demo bookings',()=>{
 const booking={id:'fictional-booking',name:'Fictional Customer',serviceName:'Consultation',staffId:'owner',date:'2026-11-07',time:'10:00',price:25,deposit:0,status:'confirmed'};
 const salon={country:'US',timezone:'America/Los_Angeles',currency:'USD',bookings:[booking]};
 for(const live of [false,true]){
  const context={window:{},pubMode:()=>live,pubBk:()=>booking,salon:()=>salon,draft:{},esc:String,humanDate:String,money:value=>'USD '+value,staffName:()=> 'Fictional Owner',bookHeader:()=>'',footer:()=>'',statusPill:()=>'',loadingPage:()=>''};
  vm.runInNewContext(localeSource,context);context.JovaBusinessLocale=context.window.JovaBusinessLocale;
  vm.runInNewContext(extract('confirmation')+'\n'+extract('manage'),context);
  for(const html of [context.confirmation(booking),context.manage(booking.id)]){
   assert.match(html,/<span>Time zone<\/span><b>America\/Los_Angeles<\/b>/);
   assert.match(html,/2026-11-07 · 10:00/);
   assert.doesNotMatch(html,/Europe\/London|UK time/);
  }
 }
});
