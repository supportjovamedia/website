import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dirty-forms.js',import.meta.url),'utf8');
class Element{
 constructor(tag='SPAN'){this.tagName=tag;this.dataset={};this.children=[];this.attributes={};this.textContent='';this.handlers={};this.tokens=new Set();this.classList={add:(...names)=>names.forEach(name=>this.tokens.add(name)),toggle:(name,on)=>{on?this.tokens.add(name):this.tokens.delete(name);},remove:(...names)=>names.forEach(name=>this.tokens.delete(name)),contains:name=>this.tokens.has(name)};}
 setAttribute(name,value){this.attributes[name]=value;}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 get lastElementChild(){return this.children.at(-1);}
 get nextElementSibling(){const list=this.parentElement?.children||[];return list[list.indexOf(this)+1]||null;}
 before(node){const parent=this.parentElement;if(node.parentElement){const old=node.parentElement.children;old.splice(old.indexOf(node),1);}node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
 prepend(node){node.parentElement=this;this.children.unshift(node);}
 addEventListener(name,handler){this.handlers[name]=handler;}
 matches(){return this.tagName==='BUTTON'||this.tagName==='INPUT'&&this.type==='submit';}
}
function harness(){
 const owner={},forms=[],proxies=[],document={readyState:'loading',addEventListener(){},createElement:tag=>new Element(tag.toUpperCase()),querySelector:selector=>selector==='.shell.jb-reference'?owner:null,querySelectorAll:selector=>selector==='form[data-form]'?forms:selector==='[data-action="ws-save-personalise"]'?proxies:[]};
 const context={window:{},document,setTimeout,queueMicrotask};vm.runInNewContext(source,context);
 function form(type='settings'){
  const f=new Element('FORM'),button=new Element('BUTTON'),footer=new Element('FOOTER'),input={name:'description',type:'text',value:'Saved value'};
  f.dataset={form:type,dirty:'false'};button.type='submit';button.textContent='Save changes';button.closest=()=>footer;footer.append(button);f.elements=[input,button];f.querySelectorAll=()=>[button];f.closest=()=>owner;f.contains=node=>node===footer;forms.push(f);return{f,input,button};
 }
 return{api:context.window.JovaDirtyForms,form,forms,proxies};
}
const indicator=button=>button.parentElement?.children.find(node=>node.className==='df-save-indicator'&&node.nextElementSibling===button);
const dotted=button=>indicator(button)?.classList.contains('is-dirty')===true;
test('external Save status reflects actual edits, reverting, failure and successful save',()=>{
 const h=harness(),{f,input,button}=h.form();h.api.scan();assert(!dotted(button));
 input.value='Changed';f.handlers.input();h.api.refreshSaveIndicators();assert(dotted(button));assert(h.api.isDirty(f));assert.equal(indicator(button).lastElementChild.textContent,'Unsaved changes');assert.equal(button.classList.contains('df-save-is-dirty'),false);assert.equal(button.children.length,0,'Status must be outside the button');
 h.api.refreshSaveIndicators();assert(dotted(button),'A failed save that has no successful baseline update stays dirty');
 input.value='Saved value';f.handlers.input();h.api.refreshSaveIndicators();assert(!dotted(button),'Reverting the field clears the dot');
 input.value='Another change';f.handlers.change();h.api.refreshSaveIndicators();assert(dotted(button));h.api.saved(f);assert(!dotted(button));assert(!h.api.isDirty(f));
 button.textContent='Saving…';h.api.refreshSaveIndicators();assert(!dotted(button),'A label change alone cannot make the form dirty');
});
test('self-managed website drafts, header proxy and discard reuse existing dirty state',()=>{
 const h=harness(),website=h.form('bw-website'),booking=h.form('ws-booking-page'),proxy=new Element('BUTTON');let active=website.f;
 proxy.textContent='Save changes';new Element('HEADER').append(proxy);proxy.closest=()=>({querySelector:()=>active});h.proxies.push(proxy);h.api.scan();assert(!dotted(proxy));
 website.f.dataset.dirty='true';h.api.refreshSaveIndicators();assert(dotted(website.button));assert(dotted(proxy));
 active=booking.f;h.api.refreshSaveIndicators();assert(!dotted(proxy),'The proxy follows the active Personalise form');
 active=website.f;h.api.discard({querySelectorAll:()=>[website.f]});assert(!dotted(proxy));assert(!dotted(website.button));
});
test('Save placement and other controls cannot create false dirty signatures or dots',()=>{
 const h=harness(),{f,input,button}=h.form();h.api.scan();const baseline=h.api.serialize(f.elements);
 button.dataset.savePlacement='top';button.textContent='Saving…';assert.equal(h.api.serialize(f.elements),baseline);
 input.value='Edit';f.handlers.input();button.textContent='Delete record';h.api.refreshSaveIndicators();assert(indicator(button).hidden,'Only a Save control gets a status');
});

test('a newly introduced Save form is tracked and theme Apply uses the same external status',()=>{
 const h=harness(),custom=h.form('future-settings'),theme=h.form('workspace-appearance');theme.button.textContent='Apply theme';h.api.scan();custom.input.value='Changed';custom.f.handlers.input();theme.input.value='Changed theme';theme.f.handlers.input();h.api.refreshSaveIndicators();assert(dotted(custom.button));assert(dotted(theme.button));assert.equal(indicator(theme.button).lastElementChild.textContent,'Unsaved changes');
});

test('multiple-session Continue retains leave tracking without altering its wizard footer',()=>{
 const h=harness(),wizard=h.form('owner-series');wizard.button.textContent='Continue';const footer=wizard.button.parentElement;h.api.scan();
 assert.equal(footer.children.length,1);assert.equal(footer.children[0],wizard.button);assert.equal(footer.classList.contains('df-save-bar'),false);assert.equal(indicator(wizard.button),undefined);
 wizard.input.value='Draft session';wizard.f.handlers.input();assert.equal(h.api.isDirty(wizard.f),true);
});
