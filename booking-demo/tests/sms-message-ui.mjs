import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const files=['business-locale.js','sms-phone.js','scheduling-core.cjs','sms-message.js','sms-reminders.js'];
const source=(await Promise.all(files.map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')))).join('\n');
function harness(){
 const context={window:{},FormData:class{},crypto:globalThis.crypto,TextEncoder,Uint8Array};
 vm.runInNewContext(source,context);
 const s={id:'fictional-studio',country:'US',timezone:'America/New_York',currency:'USD',name:'Fictional Studio',address:'1 Example Road',entitlements:{plan:'standard',offer_version:'2026-11-free-v1'}},info={available:true,eligible:true,provider_configured:true,global_enabled:true,business_enabled:true,budget_configured:true,remaining_segments:50,enabled:true,provider:'PureSMS',message_template:context.window.JovaSmsMessage.defaultMessage};
 const controls=new Map(),tools=context.window.JovaSmsReminders.create({salon:()=>s,ownerIdentity:()=> 'owner',isLive:()=>true,esc:String,render:()=>{},refreshSmsReminders:async()=>({ok:true,data:info})});
 return {context,s,tools,controls};
}

test('message editor distinguishes reminder credits from estimated SMS parts',async()=>{
 const {tools}=harness();tools.panel();await new Promise(resolve=>setImmediate(resolve));
 const html=tools.panel();
 assert.match(html,/SMS parts? estimated/);
 assert.match(html,/Maximum 3 SMS parts/);
 assert.match(html,/One reminder uses one SMS reminder credit, with up to 3 SMS parts/);
 assert.doesNotMatch(html,/SMS credits? estimated|Maximum 3 SMS credits/);
});

test('editing message parts does not relabel them as reminder credits',async()=>{
 const {context,tools,controls}=harness();tools.panel();await new Promise(resolve=>setImmediate(resolve));
 const form={dataset:{owner:'owner|fictional-studio'},querySelector:selector=>{if(!controls.has(selector))controls.set(selector,{});return controls.get(selector);}};
 const message=context.window.JovaSmsMessage.defaultMessage+' '+('x'.repeat(150)),input={name:'message',value:message,closest:()=>form};
 assert.equal(tools.input(input),true);
 assert.match(controls.get('[data-sms-credits]').textContent,/SMS parts estimated/);
 assert.match(controls.get('.sr-counter').textContent,/Maximum 3 SMS parts/);
 assert.doesNotMatch(controls.get('[data-sms-credits]').textContent,/credit/);
});

test('timezone is optional in existing templates and explicit in the new default preview',()=>{
 const {context,s}=harness(),core=context.window.JovaSmsMessage;
 assert.match(core.defaultMessage,/\{timezone\}/);
 assert.equal(core.valid(core.defaultMessage),true);
 assert.match(core.preview(core.defaultMessage,s),/America\/New_York/);
 const legacy='Reminder at {time} on {date}. {business}.';
 assert.equal(core.valid(legacy),true);
 assert.equal(core.preview(legacy,s).includes('America/New_York'),false);
 assert.equal(core.valid(legacy+' {private_customer_data}'),false);
});
