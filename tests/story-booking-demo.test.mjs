import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {jovabookDemo} from '../lib/jovabook-demo.mjs';

const require=createRequire(import.meta.url);
const React=require('react');

test('fictional booking demo preserves selections and shows a complete deposit breakdown',async()=>{
  const swc=require('next/dist/build/swc');
  await swc.loadBindings();
  const source=await readFile(new URL('../app/jovabook/story/OriginalSections.js',import.meta.url),'utf8');
  const {code}=await swc.transform(source+'\nexport {BookingSection};',{filename:'OriginalSections.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
  let states=[],cursor=0;
  const hooks={...React,useState(initial){const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useRef(){return {current:null};}};
  const exports={};
  vm.runInNewContext(code,{exports,React,Intl,requestAnimationFrame:fn=>fn(),require:name=>{
    if(name==='react')return hooks;
    if(name==='./portal-screens.mjs')return {portalScreens:{}};
    if(name==='../../../lib/jovabook-demo.mjs')return {jovabookDemo};
    throw new Error('Unexpected dependency '+name);
  }});
  let tree;
  const render=()=>{cursor=0;tree=exports.BookingSection();};
  const nodes=(node=tree)=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(child=>nodes(child))];
  const text=node=>typeof node==='string'||typeof node==='number'?String(node):!node?'':React.Children.toArray(node.props?.children).map(text).join('');
  const button=label=>{const found=nodes().find(node=>node.type==='button'&&text(node).includes(label));assert.ok(found,'Missing button '+label);return found;};
  const click=label=>{button(label).props.onClick();render();};
  const row=label=>{const found=nodes().find(node=>node.props?.className==='review-row'&&text(React.Children.toArray(node.props.children)[0])===label);assert.ok(found,'Missing review row '+label);return text(React.Children.toArray(found.props.children)[1]);};
  const samples=[['Brow shape & tint','£25.00','£5.00','£20.00'],['Lash lift','£55.00','£11.00','£44.00'],['Gel manicure','£35.00','£7.00','£28.00']];
  for(const [name,total,deposit,balance] of samples){
    states=[];render();
    assert.match(text(button(name)),new RegExp('20% deposit: '+deposit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    click(name);click('Choose a date');click('Wed 11 Nov');click('14:30');click('See review');
    assert.equal(row('Service'),name);
    assert.equal(row('Date'),'Wed 11 Nov');
    assert.equal(row('Time'),'14:30');
    assert.equal(row('Total'),total);
    assert.equal(row('Sample deposit (20%)'),deposit);
    assert.equal(row('Remaining at appointment'),balance);
    assert.equal(button('Finish demo').props.type,'button');
    click('Back');
    assert.equal(button('Wed 11 Nov').props['aria-pressed'],true);
    assert.equal(button('14:30').props['aria-pressed'],true);
    click('See review');click('Finish demo');
    assert.match(text(tree),/No appointment was made and no payment was taken\./);
    assert.ok(nodes().some(node=>node.props?.role==='status'));
    click('Try again');
    assert.equal(button('Brow shape & tint').props['aria-pressed'],true);
  }
});
