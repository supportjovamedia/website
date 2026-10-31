import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../service-management.js',import.meta.url),'utf8');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(){
 const context={window:{}};vm.runInNewContext(source,context);let renders=0;
 let state={id:'business-a',buffer:15,categories:[{id:'hair',name:'Hair'},{id:'nails',name:'Nails'}],staff:[{id:'a',name:'Sam',active:true},{id:'b',name:'River',active:false}],services:[{id:'cut',name:'Cut & finish',duration:75,price:48,categoryId:'hair',staffIds:['a']},{id:'gel',name:'Gel manicure',duration:45,price:30,categoryId:'nails',staffIds:['b']},{id:'other',name:'Consultation',duration:15,price:0,categoryId:'removed',staffIds:[]}]};
 const tools=context.window.JovaServices.create({salon:()=>state,esc,money:v=>'£'+Number(v).toFixed(2),render:()=>renders++});
 return {tools,get state(){return state;},setState:s=>state=s,get renders(){return renders;}};
}
test('groups actual services and categories with honest shared buffer and host actions',()=>{
 const x=setup(),before=structuredClone(x.state),html=x.tools.pages.services();
 for(const text of ['All services','Hair','Nails','No category','Cut &amp; finish','1 hr 15 min','£48.00','No staff assigned','Business-wide buffer'])assert(html.includes(text),text);
 assert.equal((html.match(/class="sm-buffer"/g)||[]).length,3);assert(html.includes('>15 min</span>'));
 for(const action of ['add-service','edit-service','remove-service','add-category','edit-category','delete-category'])assert(html.includes('data-action="'+action+'"'),action);
 assert.deepEqual(x.state,before);
});
test('status derives from active assigned staff without a fabricated service toggle',()=>{
 const x=setup(),html=x.tools.pages.services();assert.equal((html.match(/class="sm-status is-bookable"/g)||[]).length,1);assert.equal((html.match(/class="sm-status needs-staff"/g)||[]).length,2);assert(!html.includes('type="checkbox"'));
});
test('category filters are read-only, recover from category removal and reset per tenant',()=>{
 const x=setup();x.tools.pages.services();assert.equal(x.tools.click('sm-category',{dataset:{category:'nails'}}),true);let html=x.tools.pages.services();assert(html.includes('Gel manicure'));assert(!html.includes('Cut &amp; finish'));assert.equal(x.renders,1);
 x.state.categories=x.state.categories.filter(c=>c.id!=='nails');html=x.tools.pages.services();assert(html.includes('Cut &amp; finish'));assert(html.includes('aria-pressed="true" class="is-selected"><span>All services'));
 x.tools.click('sm-category',{dataset:{category:'hair'}});x.setState({...x.state,id:'business-b'});assert(x.tools.pages.services().includes('Consultation'));
 assert.equal(x.tools.click('edit-service',{dataset:{id:'cut'}}),false,'Host retains writes');
});
test('empty menus offer recovery and untrusted names stay escaped',()=>{
 const x=setup();x.state.categories[0].name='<script>Category</script>';x.state.services[0].name='<img src=x>';let html=x.tools.pages.services();assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;img src=x&gt;'));assert(!html.includes('<script>'));
 x.state.categories=[];x.state.services=[];html=x.tools.pages.services();assert(html.includes('Add your first service'));assert(!html.includes('<table'));
});

test('a successfully added empty category is revealed immediately from another category filter',()=>{
 const x=setup();x.tools.pages.services();x.tools.click('sm-category',{dataset:{category:'hair'}});
 x.state.categories.push({id:'skin',name:'Skin treatments'});
 const before=structuredClone(x.state);assert.equal(x.tools.revealCategory('skin'),true);
 const html=x.tools.pages.services();assert(html.includes('data-category="skin" aria-pressed="true"'));
 assert(html.includes('data-service-category="skin"'));assert(html.includes('No services in this category'));
 assert(!html.includes('data-service-category="hair"'));assert.equal(x.tools.creationCategory(),'skin');
 assert.deepEqual(x.state,before,'Revealing a saved category must not rewrite business data');
});

test('new service forms inherit the selected valid category and a saved service reveals its actual group',()=>{
 const x=setup();x.tools.pages.services();assert.equal(x.tools.creationCategory(),'');
 x.tools.click('sm-category',{dataset:{category:'nails'}});assert.equal(x.tools.creationCategory(),'nails');
 x.state.services.push({id:'new-service',name:'New manicure',duration:30,price:42,categoryId:'nails',staffIds:['a']});
 assert.equal(x.tools.revealService('new-service'),true);let html=x.tools.pages.services();
 assert(html.includes('data-service-id="new-service"'));assert(html.includes('£42.00'));
 x.state.services.find(s=>s.id==='new-service').categoryId='hair';
 assert.equal(x.tools.revealService('new-service'),true);html=x.tools.pages.services();
 assert(html.includes('data-category="hair" aria-pressed="true"'));assert(html.includes('data-service-id="new-service"'));
 assert(!html.includes('data-service-category="nails"'));
});

test('uncategorised saves stay visible and removing the last ungrouped service resets the invisible filter',()=>{
 const x=setup();x.tools.pages.services();assert.equal(x.tools.revealService('other'),true);
 let html=x.tools.pages.services();assert(html.includes('data-category="__uncategorised__" aria-pressed="true"'));
 assert.equal(x.tools.creationCategory(),'');x.state.services=x.state.services.filter(s=>s.id!=='other');
 html=x.tools.pages.services();assert(html.includes('data-category="all" aria-pressed="true"'));
 assert(!html.includes('data-category="__uncategorised__"'));
});

test('save reveal hooks reject missing records and stale business identities without changing filters',()=>{
 const x=setup();x.tools.pages.services();x.tools.click('sm-category',{dataset:{category:'nails'}});
 assert.equal(x.tools.revealCategory('missing'),false);assert.equal(x.tools.revealService('missing'),false);
 assert(x.tools.pages.services().includes('data-category="nails" aria-pressed="true"'));
 x.setState({...x.state,id:'business-b'});
 assert.equal(x.tools.revealCategory('hair','business-a'),false);assert.equal(x.tools.revealService('cut','business-a'),false);
 assert(x.tools.pages.services().includes('data-category="all" aria-pressed="true"'));
 assert.equal(x.tools.creationCategory(),'');
});
