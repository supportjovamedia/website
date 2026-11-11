import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../owner-welcome.js',import.meta.url),'utf8');
test('welcome checks only a visible verified dashboard and never polls or repeats on render',async()=>{
 let active=false,calls=0,identity='owner-one';const window={},document={querySelector:()=>null};
 vm.runInNewContext(source,{window,document});const welcome=window.JovaOwnerWelcome.create({directory:{remote:true,sessionIdentity:()=>identity,claimOwnerWelcome:async()=>{calls++;return {ok:true,show:false};}},identity:()=>identity,visible:()=>active});
 await welcome.check();assert.equal(calls,0);active=true;await welcome.check();await welcome.check();assert.equal(calls,1);identity='owner-two';await welcome.check();assert.equal(calls,2);
});
test('a failed welcome claim cannot block the dashboard or start retry loops',async()=>{
 let calls=0,identity='owner-one';const window={},document={querySelector:()=>null};vm.runInNewContext(source,{window,document});const welcome=window.JovaOwnerWelcome.create({directory:{remote:true,sessionIdentity:()=> 'owner-one',claimOwnerWelcome:async()=>{calls++;throw Error('Offline');}},identity:()=>identity,visible:()=>true});
 await welcome.check();await welcome.check();assert.equal(calls,1);
});

test('a new owner is offered setup once after the dashboard is ready',async()=>{
 let starts=0,identity='new-owner';const window={},document={querySelector:()=>null};vm.runInNewContext(source,{window,document});
 const welcome=window.JovaOwnerWelcome.create({directory:{remote:true,sessionIdentity:()=> 'new-owner',claimOwnerWelcome:async()=>({ok:true,show:true})},identity:()=>identity,visible:()=>true,offer:()=>{starts++;}});
 await welcome.check();await welcome.check();assert.equal(starts,1);
});
