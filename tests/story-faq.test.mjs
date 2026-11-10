import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {faqs} from '../app/jovabook/faqs.mjs';

const require=createRequire(import.meta.url);
const React=require('react');

test('FAQ reveal preserves all content and cleanly closes hidden answers',async()=>{
  const swc=require('next/dist/build/swc');
  await swc.loadBindings();
  const source=await readFile(new URL('../app/jovabook/story/Faq.js',import.meta.url),'utf8');
  const {code}=await swc.transform(source,{filename:'Faq.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
  let state=false,effects=[],focusCount=0;
  const details=faqs.map(()=>({open:false}));
  const items=details.map(detail=>({hidden:false,querySelectorAll:()=>detail.open?[detail]:[]}));
  const root={querySelectorAll:()=>items};
  const hooks={...React,useState(){return [state,value=>{state=typeof value==='function'?value(state):value;}];},useRef(){return {current:root};},useEffect(effect){effects.push(effect);}};
  function FaqStory(){}
  const exports={};
  vm.runInNewContext(code,{exports,React,require:name=>{
    if(name==='react')return hooks;
    if(name==='@/components/ScrollStories')return {FaqStory};
    if(name==='../faqs.mjs')return {faqs};
    throw new Error('Unexpected dependency '+name);
  }});
  let tree;
  const render=()=>{effects=[];tree=exports.default();effects.forEach(effect=>effect());};
  const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
  const toggle=()=>nodes(tree).find(node=>node.type==='button');
  const click=()=>{toggle().props.onClick({currentTarget:{focus(options){assert.equal(options.preventScroll,true);focusCount++;}}});render();};
  render();
  const faq=nodes(tree).find(node=>node.type===FaqStory);
  assert.deepEqual(JSON.parse(JSON.stringify(faq.props.items)),faqs.map(({question,answer})=>[question,answer]));
  assert.equal(faq.props.contactLabel,'Ask the JovaMedia team');
  assert.equal(items.filter(item=>!item.hidden).length,6);
  assert.equal(toggle().props['aria-expanded'],false);
  assert.equal(toggle().props.children[0],'Show more FAQs');
  assert.equal(toggle().props['aria-controls'],'jovabook-faq-content');
  click();
  assert.equal(items.filter(item=>!item.hidden).length,faqs.length);
  assert.equal(toggle().props['aria-expanded'],true);
  assert.equal(toggle().props.children[0],'Show fewer FAQs');
  details[8].open=true;
  details[1].open=true;
  click();
  assert.equal(items.filter(item=>!item.hidden).length,6);
  assert.equal(details[8].open,false);
  assert.equal(details[1].open,true);
  assert.equal(focusCount,2);
  click();
  assert.equal(details[8].open,false);
  assert.equal(items.filter(item=>!item.hidden).length,faqs.length);
});
