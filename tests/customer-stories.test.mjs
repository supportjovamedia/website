import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const swc=require('next/dist/build/swc');await swc.loadBindings();
const {code}=await swc.transform(await readFile(new URL('../app/jovabook/story/CustomerStories.js',import.meta.url),'utf8'),{filename:'CustomerStories.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
const expected=[
 ['Keith Loddy','“I love how easy the management dashboard is and I love that I can personalise it. It looks so modern and classy”'],
 ['Charmaine Dias','“JovaBook makes it easy for my clients to book online, and I can see everything in one place.”'],
 ['Ankit Shah','“Having my booking page, calendar and website together has made managing appointments much simpler.”'],
 ['Zhang Min','“My clients can book and pay a deposit online, which means less time going back and forth over messages.”'],
 ['Paul Smith','“The setup was straightforward, and I like having a booking page that feels personal to my business.”']
];
function harness(){
 let active=0;const gesture={current:null},exports={},hooks={...React,useState(){return [active,value=>{active=typeof value==='function'?value(active):value;}];},useRef(){return gesture;}};
 vm.runInNewContext(code,{exports,React,require:name=>{assert.equal(name,'react');return hooks;}});
 const render=()=>exports.default();
 const nodes=node=>!node||typeof node!=='object'?[]:typeof node.type==='function'?nodes(node.type(node.props)):[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
 const text=node=>typeof node==='string'||typeof node==='number'?String(node):!node?'':typeof node.type==='function'?text(node.type(node.props)):React.Children.toArray(node.props?.children).map(text).join('');
 const find=(tree,predicate)=>nodes(tree).find(predicate);
 const button=label=>find(render(),node=>node.type==='button'&&node.props['aria-label']===label);
 const featured=()=>find(render(),node=>node.type==='article'&&node.props['data-story-state']==='featured');
 return {render,nodes,text,find,button,featured,active:()=>active,stories:exports.customerStories};
}

test('customer stories preserve the exact five name and quote pairs in SSR',()=>{
 const h=harness(),tree=h.render(),html=renderToStaticMarkup(tree),quotes=h.nodes(tree).filter(node=>node.type==='blockquote').map(h.text);
 assert.deepEqual(JSON.parse(JSON.stringify(h.stories.map(({name,quote})=>[name,quote]))),expected);
 assert.equal(h.nodes(tree).filter(node=>node.type==='article').length,5);
 assert.equal((html.match(/<blockquote>/g)||[]).length,5);assert.equal((html.match(/<mark/g)||[]).length,0);
 for(const [,quote] of expected)assert(quotes.includes(quote));
 assert.equal(h.nodes(tree).filter(node=>node.type==='article'&&node.props.hidden).length,4);
 assert.equal(h.nodes(tree).filter(node=>node.type==='button'&&node.props.className==='cs-dot').length,5);
 assert.equal(h.stories.find(story=>story.name==='Paul Smith').business,'CoreFitness');
 assert(h.stories.filter(story=>story.name!=='Paul Smith').every(story=>!story.business));
});

test('dots, arrows, keyboard and horizontal touch select every story without changing its quote',()=>{
 const h=harness();
 for(let i=0;i<5;i++){
  h.button('Show story by '+expected[i][0]).props.onClick();assert.equal(h.active(),i);
  assert.equal(h.text(h.find(h.featured(),node=>node.type==='blockquote')),expected[i][1]);
 }
 h.button('Next customer story').props.onClick();assert.equal(h.active(),0);
 h.button('Previous customer story').props.onClick();assert.equal(h.active(),4);
 const grid=()=>h.find(h.render(),node=>node.props.id==='customer-stories-slides');
 let prevented=0;
 for(const [key,index] of [['Home',0],['End',4],['ArrowRight',0],['ArrowLeft',4]]){grid().props.onKeyDown({key,preventDefault(){prevented++;}});assert.equal(h.active(),index);}
 assert.equal(prevented,4);
 grid().props.onKeyDown({key:'ArrowRight',ctrlKey:true,preventDefault(){throw Error('Browser shortcut must be preserved');}});assert.equal(h.active(),4);
 const pointer=(x,y)=>({pointerType:'touch',clientX:x,clientY:y,pointerId:1,currentTarget:{setPointerCapture(){}}});
 grid().props.onPointerDown(pointer(200,100));grid().props.onPointerUp(pointer(80,105));assert.equal(h.active(),0);
 grid().props.onPointerDown(pointer(200,100));grid().props.onPointerUp(pointer(190,220));assert.equal(h.active(),0);
 grid().props.onPointerDown(pointer(200,100));grid().props.onPointerCancel();grid().props.onPointerUp(pointer(80,100));assert.equal(h.active(),0);
 assert.equal(h.nodes(h.render()).filter(node=>node.type==='article').length,5);
});


test('primary mouse drag works while taps, secondary buttons, diagonal motion and pinch stay unchanged',()=>{
 const h=harness(),grid=()=>h.find(h.render(),node=>node.props.id==='customer-stories-slides');
 const pointer=(x,y,extra={})=>({pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y,pointerId:1,currentTarget:{setPointerCapture(){}},...extra});
 const drag=(from,to)=>{grid().props.onPointerDown(from);grid().props.onPointerUp(to);};
 drag(pointer(200,100),pointer(80,102));assert.equal(h.active(),1);
 drag(pointer(80,100),pointer(200,102));assert.equal(h.active(),0);
 drag(pointer(100,100),pointer(105,103));assert.equal(h.active(),0);
 drag(pointer(200,100,{button:2}),pointer(80,100,{button:2}));assert.equal(h.active(),0);
 drag(pointer(200,100),pointer(130,200));assert.equal(h.active(),0);
 grid().props.onPointerDown(pointer(200,100,{pointerType:'touch'}));
 grid().props.onPointerDown(pointer(150,100,{pointerType:'touch',isPrimary:false,pointerId:2}));
 grid().props.onPointerUp(pointer(80,100,{pointerType:'touch'}));assert.equal(h.active(),0);
});
