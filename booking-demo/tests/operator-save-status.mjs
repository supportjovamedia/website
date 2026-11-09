import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../operator.js',import.meta.url),'utf8');
const start=source.indexOf('/* Save feedback is separate'),end=source.indexOf('})();',start)+5;
class Element{
 constructor(){this.children=[];this.textContent='';this.attributes={};this.tokens=new Set();this.classList={toggle:(name,on)=>on?this.tokens.add(name):this.tokens.delete(name)};}
 append(...nodes){for(const node of nodes){if(node.parent){const previous=node.parent.children;previous.splice(previous.indexOf(node),1);}node.parent=this;this.children.push(node);}}
 before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
 setAttribute(key,value){this.attributes[key]=value;}
}
test('Operator Save status stays external, clears on revert, retains failed drafts, and isolates each form',()=>{
 let scan;const listeners={},forms=[];
 function form(name){const node=new Element(),button=new Element(),input={name:'note',type:'textarea',value:''};button.textContent=name;node.append(button);node.elements=[input];node.querySelectorAll=()=>[button];input.closest=()=>node;forms.push(node);return {node,button,input,status:()=>button.parent.children[0]};}
 const note=form('Save note'),review=form('Save commission decision'),login=form('Log in');
 const root={querySelectorAll:()=>forms,addEventListener:(name,fn)=>listeners[name]=fn};
 vm.runInNewContext(source.slice(start,end),{document:{getElementById:()=>root,createElement:()=>new Element()},MutationObserver:class{constructor(fn){scan=fn;}observe(){}},queueMicrotask});
 assert.equal(note.status().textContent,'No unsaved changes');assert.equal(login.node.children.length,1);
 note.input.value='Support draft';listeners.input({target:note.input});assert.equal(note.status().textContent,'Unsaved changes');assert(note.status().tokens.has('is-dirty'));assert.equal(note.button.children.length,0);assert.equal(review.status().textContent,'No unsaved changes');
 scan();assert.equal(note.status().textContent,'Unsaved changes','A failed request must not advance the baseline');
 note.input.value='';listeners.change({target:note.input});assert.equal(note.status().textContent,'No unsaved changes');
 const refreshed=form('Save note');scan();assert.equal(refreshed.status().textContent,'No unsaved changes','A successfully refreshed form starts clean');
});
