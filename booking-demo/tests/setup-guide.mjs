import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(await readFile(new URL('../setup-guide.js',import.meta.url),'utf8'),context);
const guide=context.window.JovaSetupGuide;
const fresh={name:'Avery Studio',email:'avery@example.test',services:[],staff:[{id:'owner',active:true}],hours:{days:[],start:'09:00',end:'18:00'}};
test('skipping advances coverage without marking business data complete',()=>{
 assert.equal(guide.nextStep(fresh,{}).id,'details');
 const options={guide:{mode:'paused',step:'hours',waived:['details']}};
 assert.equal(guide.status(fresh,options).completed,1);
 assert.equal(guide.status(fresh,options).ready,false);
 assert.equal(guide.resumeStep(fresh,options).id,'hours');
 assert.match(guide.render(fresh,options),/45% complete.*Resume demo.*Skip demo/);
 assert.match(guide.render(fresh,{guide:{mode:'done',skipped:true}}),/Setup demo skipped.*Start demo/);
});
test('an existing mobile business resumes at its first genuinely unfinished step',()=>{
 const existing={...fresh,phone:'020 7946 0123',hours:{days:[1],start:'09:00',end:'18:00'},services:[{staffIds:['owner']}]};
 assert.equal(guide.nextStep(existing,{addressRequired:false}).id,'website');
 assert.equal(guide.nextStep(existing,{addressRequired:true}).id,'details');
 assert.equal(guide.nextStep({...existing,staff:[{id:'owner',active:false}]},{addressRequired:false}).id,'category');
});
test('a refreshed checkpoint belongs to the original owner and business',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 guide.createState(storage).write('owner','studio',{mode:'paused',step:'website',section:'about',waived:['details']});
 const loaded=guide.createState(storage);
 assert.equal(loaded.read('owner','studio').section,'about');
 assert.equal(loaded.read('owner','other').mode,'new');
 assert.equal(loaded.read('someone-else','studio').mode,'new');
});
