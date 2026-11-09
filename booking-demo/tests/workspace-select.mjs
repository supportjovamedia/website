import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../workspace-select.js',import.meta.url),'utf8');
const context={module:{exports:{}}};vm.runInNewContext(source,context);
const {enabledRows,nextIndex,matchText,flags}=context.module.exports;
const rows=[{index:0,label:'United Kingdom',value:'GB',disabled:false,hidden:false},{index:1,label:'United States',value:'US',disabled:true,hidden:false},{index:2,label:'Canada',value:'CA',disabled:false,hidden:false},{index:3,label:'Hidden country',value:'ZZ',disabled:false,hidden:true},{index:4,label:'Australia',value:'AU',disabled:false,hidden:false}];
test('keyboard movement skips disabled and hidden options and remains bounded',()=>{
 assert.equal(nextIndex(rows,0,1),2);assert.equal(nextIndex(rows,4,1),4);assert.equal(nextIndex(rows,0,-1),0);
 assert.equal(nextIndex(rows,-1,1),0);assert.equal(nextIndex(rows,-1,-1),4);assert.equal(nextIndex(rows.map(row=>({...row,disabled:true})),0,1),-1);
});
test('typeahead is case-insensitive, wraps and never selects disabled or hidden options',()=>{
 assert.equal(matchText(rows,'CAN',0),2);assert.equal(matchText(rows,'United',4),0);assert.equal(matchText(rows,'United States',0),-1);assert.equal(matchText(rows,'Hidden',0),-1);assert.equal(matchText(rows,'no match',0),-1);
});
test('native optgroup availability and country SVG flags preserve control semantics',()=>{
 const options=[{label:'A',value:'a',disabled:false,hidden:false,parentElement:{tagName:'OPTGROUP',label:'One',disabled:true}},{label:'B',value:'b',disabled:false,hidden:true,parentElement:{tagName:'SELECT'}}];
 const read=enabledRows({options});assert.equal(read[0].disabled,true);assert.equal(read[0].group,'One');assert.equal(read[1].hidden,true);
 for(const code of ['GB','US','CA','AU']){assert(flags[code].startsWith('<svg'));assert(flags[code].includes('aria-hidden="true"'));assert(!flags[code].includes('<image'));}
});
