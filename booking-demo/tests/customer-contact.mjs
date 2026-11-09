import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../workspace.js',import.meta.url),'utf8');
const reference=source.slice(source.indexOf('/* Reference-led owner presentation.'),source.indexOf('/* vanilla-colorful'));
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function row(details){
 const context={window:{}},customer={id:'client',name:'Alex Customer',...details};
 vm.runInNewContext(reference,context);
 const salon={id:'business',customers:[customer],bookings:[]};
 return context.window.JovaReference.create({salon:()=>salon,esc,money:String,humanDate:String}).customers({list:[customer],query:''});
}

test('saved valid customer contacts use native email and telephone links',()=>{
 const html=row({phone:'+44 (7700) 900123',email:'alex@example.test'});
 assert.match(html,/class="jg-client-contact-action jg-client-call" href="tel:\+447700900123" aria-label="Call Alex Customer"/);
 assert.match(html,/class="jg-client-contact-action jg-client-email" href="mailto:alex%40example.test" aria-label="Email Alex Customer"/);
 assert.match(row({phone:'07700 900123'}),/href="tel:07700900123"/);
});

test('missing and invalid saved contacts never create contact buttons',()=>{
 for(const phone of ['',undefined,'123','javascript:alert(1)','07700900123?x=1']){
  const html=row({phone,email:'alex@example.test'});
  assert.doesNotMatch(html,/href="tel:/);
  assert.match(html,/href="mailto:/);
 }
 for(const email of ['',undefined,'not-an-email','alex@example.test?bcc=other@example.test','alex@example.test\nBcc:other@example.test']){
  assert.doesNotMatch(row({email}),/href="mailto:/);
 }
});
