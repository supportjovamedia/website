import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const swc=require('next/dist/build/swc');await swc.loadBindings();
const sources={};
for(const name of ['ReferralsPreview','SupportPreview'])sources[name]=(await swc.transform(await readFile(new URL(`../app/jovabook/story/${name}.js`,import.meta.url),'utf8'),{filename:`${name}.js`,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}})).code;
const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
function component(name,{production=false}={}){
 const exports={},loads=[],notices=[],win={location:{hostname:production?'www.jovamedia.com':'127.0.0.1'}};
 vm.runInNewContext(sources[name],{exports,React,window:win,document:{},require:module=>{
  if(module==='react')return {...React,useState:()=>['',n=>notices.push(n)]};
  if(module.endsWith('.css'))return {};
  if(module==='@/lib/live-chat.mjs')return {loadLiveChat:(...args)=>loads.push(args)};
  if(module==='@/lib/editorial-routes.mjs')return {productionAnalyticsHost:host=>host==='www.jovamedia.com'};
  throw Error(`Unexpected dependency ${module}`);
 }});return {tree:exports.default(),win,loads,notices};
}
test('referral card retains the existing owner link and qualifying terms without decorative CTA arrows',()=>{
 const {tree}=component('ReferralsPreview'),all=nodes(tree),html=renderToStaticMarkup(tree),links=all.filter(n=>n.type==='a');
 assert.equal(links.length,1);assert.equal(links[0].props.href,'https://book.jovamedia.com/?portal=owner#referrals');assert.equal(nodes(links[0]).filter(n=>n.type==='svg').length,0);
 const terms=all.find(n=>n.type==='details');assert.equal(terms.props.open,undefined);assert.equal(nodes(terms).find(n=>n.type==='summary').props.children,'How referrals work');
 assert.equal(links[0].props.children,'View referrals in your dashboard');
 assert.equal(React.Children.toArray(tree.props.children).at(-1).props.className,'rf-referral-terms');
 for(const text of ['before account creation','paid monthly Solo or Team cycle','eligibility review','Annual invoices are excluded','Free members receive a Solo month','not client or payment details'])assert.ok(html.includes(text));
 assert.equal(all.filter(n=>n.type==='li').length,3);
});
test('support button keeps the chat glyph and invokes the existing Crisp loader and open commands on the live host',()=>{
 const h=component('SupportPreview',{production:true}),button=nodes(h.tree).find(n=>n.type==='button');assert.equal(nodes(button).filter(n=>n.type==='svg').length,1);
 button.props.onClick();assert.equal(h.loads.length,1);assert.equal(h.loads[0][0],h.win);assert.deepEqual(JSON.parse(JSON.stringify(h.win.$crisp)),[['do','chat:show'],['do','chat:open']]);assert.match(h.notices[0],/Opening live chat/);
});
test('support click on localhost shows the existing notice without loading or opening Crisp',()=>{
 const h=component('SupportPreview');nodes(h.tree).find(n=>n.type==='button').props.onClick();assert.equal(h.loads.length,0);assert.equal(h.win.$crisp,undefined);assert.match(h.notices[0],/live JovaMedia website/);
});
