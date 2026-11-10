import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),swc=require('next/dist/build/swc');
await swc.loadBindings();
const compile=async name=>(await swc.transform(await readFile(new URL('../components/'+name+'.js',import.meta.url),'utf8'),{filename:name+'.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}})).code;
const [cookieSource,growthSource]=await Promise.all(['CookieConsent','GrowthSignup'].map(compile));
function render(source,{consent=null,states=[],props={}}={}){
 let index=0;const links=[],exports={},hooks={...React,useEffect(){},useRef:()=>({current:null}),useId:()=>':test:',useSyncExternalStore:()=>consent,useState:initial=>[states[index++]??(typeof initial==='function'?initial():initial),()=>{}]};
 function Link(props){links.push(props);return React.createElement('a',props);}
 const imports={'react':hooks,'next/link':Link,'next/dynamic':()=>()=>null,'react-dom':{createPortal:node=>node},'@/lib/owner-funnel-client.mjs':{shareFunnelConsent(){}},'@/lib/marketing-analytics.mjs':{CONSENT_KEY:'consent',browserConsent:()=>consent,revokeTracking(){},trackEvent(){}}};
 vm.runInNewContext(source,{exports,React,process:{env:{}},document:{body:{}},require:name=>{if(name.endsWith('.module.css'))return {};assert(name in imports,'Unexpected dependency '+name);return imports[name];}});
 const tree=exports.default(props),nodes=[];
 const walk=node=>{if(!node||typeof node!=='object')return;if(typeof node.type==='function'){walk(node.type(node.props));return;}nodes.push(node);React.Children.toArray(node.props?.children).forEach(walk);};walk(tree);
 return {links,nodes};
}

test('cookie privacy links never prefetch in fresh, saved and settings states',()=>{
 for(const consent of [null,'accepted','rejected'])for(const configuring of [false,true]){
  const {links,nodes}=render(cookieSource,{consent,states:[configuring,configuring,false,false]});
  assert(links.length>0);assert(links.every(link=>link.prefetch===false));
  assert(links.some(link=>link.href==='/privacy-policy#link-statistics'));
  assert(nodes.some(node=>node.type==='button'&&node.props.children==='Accept all'));
  assert(nodes.some(node=>node.type==='button'&&node.props.children==='Reject all'));
 }
});

test('growth links stay clickable without prefetch in both forms and conditional success',()=>{
 for(const newsletter of [false,true])for(const resourceUrl of [null,'/resources/google-visibility-checklist']){
  const {links,nodes}=render(growthSource,{props:{newsletter},states:[{busy:false,message:'',error:false,resourceUrl}]});
  assert(links.every(link=>link.prefetch===false));assert(links.some(link=>link.href==='/privacy-policy'));
  assert.equal(links.some(link=>link.href==='/resources#google-guides'),newsletter);
  assert.equal(links.some(link=>link.href==='/resources/google-visibility-checklist'),!!resourceUrl);
  const form=nodes.find(node=>node.type==='form');assert.equal(form.props.method,'post');assert.equal(typeof form.props.onSubmit,'function');
  assert(nodes.some(node=>node.type==='input'&&node.props.type==='email'&&node.props.required));
 }
});
