import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function toast('),source.indexOf('\nfunction error(',source.indexOf('function toast(')));
class Element{
 constructor(){this.dataset={};this.attributes={};this.children=[];this.classes=new Set();this.events={};this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n)};}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(name,fn){this.events[name]=fn;}
 cloneNode(){const next=new Element();next.attributes={...this.attributes};return next;}
}
function setup(extra={}){
 const root=new Element(),timers=new Map();let id=0;
 const context={document:{createElement:()=>new Element(),createElementNS:()=>new Element()},$:()=>root,setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key),salon:()=>({id:'demo'}),isLive:()=>false,...extra};
 vm.runInNewContext(`let toastTimer;${fn};this.showToast=toast`,context);
 return {root,timers,context,toast:context.showToast};
}
test('confirmed action has accessible check, X and a fresh four-second lifetime',()=>{
 const {root,timers,toast}=setup();toast('Customer added.');
 assert.equal(root.dataset.kind,'success');assert.equal(root.children[1].textContent,'Customer added');
 assert.equal(root.attributes.role,'status');assert.equal(root.attributes['aria-live'],'polite');
 assert.equal(root.children[2].attributes['aria-label'],'Dismiss notification');assert.equal([...timers.values()][0].delay,4000);
 toast('Category added.');assert.equal(timers.size,1);assert.equal(root.children[1].textContent,'Category added');
 root.children[2].events.click();assert.equal(root.classList.contains('show'),false);assert.equal(timers.size,0);
});
test('failures and untrusted messages never acquire success styling or execute HTML',()=>{
 const {root,toast}=setup();toast('Change not saved: denied');assert.equal(root.dataset.kind,'error');
 toast('<img src=x onerror=alert(1)>');assert.equal(root.dataset.kind,'neutral');assert.equal(root.children[1].textContent,'<img src=x onerror=alert(1)>');
 assert.equal(root.children[1].children.length,0);
 toast('Booking cancelled. Slot released.');assert.equal(root.dataset.kind,'success');assert.match(root.children[1].textContent,/cancelled/);
});
test('a queued live write shows success only after sync and does not override a subsequent failure',async()=>{
 let pending=true,resolve;const sync=new Promise(r=>resolve=r);
 const {root,toast}=setup({isLive:()=>true,salon:()=>({id:'one'}),dir:{sessionIdentity:()=> 'owner'},syncPending:()=>pending,syncBlocked:false,flushSync:()=>sync});
 toast('Service saved.');assert.equal(root.classList.contains('show'),false);
 pending=false;resolve();await sync;await Promise.resolve();assert.equal(root.dataset.kind,'success');
 pending=true;toast('Customer added.');toast('Change not saved: rejected');await Promise.resolve();assert.equal(root.dataset.kind,'error');
});
test('a rejected live write never displays a successful confirmation',async()=>{
 let resolve;const sync=new Promise(r=>resolve=r);
 const {root,context,toast}=setup({isLive:()=>true,salon:()=>({id:'one'}),dir:{sessionIdentity:()=> 'owner'},syncPending:()=>false,syncBlocked:true,flushSync:()=>sync});
 toast('Category deleted.');assert.equal(root.classList.contains('show'),false);
 resolve();await sync;await Promise.resolve();assert.equal(root.classList.contains('show'),false);
 context.syncBlocked=false;toast('Category deleted.');assert.equal(root.dataset.kind,'success');
});
