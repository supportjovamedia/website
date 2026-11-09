import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../service-management.js',import.meta.url),'utf8');
const paginationSource=await readFile(new URL('../list-pages.js',import.meta.url),'utf8');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(){
 const context={window:{}};vm.runInNewContext(paginationSource,context);vm.runInNewContext(source,context);let renders=0;
 let state={id:'business-a',buffer:15,categories:[{id:'hair',name:'Hair'},{id:'nails',name:'Nails'}],staff:[{id:'a',name:'Sam',active:true},{id:'b',name:'River',active:false}],services:[{id:'cut',name:'Cut & finish',duration:75,price:48,categoryId:'hair',staffIds:['a']},{id:'gel',name:'Gel manicure',duration:45,price:30,categoryId:'nails',staffIds:['b']},{id:'other',name:'Consultation',duration:15,price:0,categoryId:'removed',staffIds:[]}]};
 const tools=context.window.JovaServices.create({salon:()=>state,esc,money:v=>'£'+Number(v).toFixed(2),render:()=>renders++});
 return {tools,pages:context.window.JovaListPages,get state(){return state;},setState:s=>state=s,get renders(){return renders;}};
}
test('groups actual services and categories with compact records and host actions',()=>{
 const x=setup(),before=structuredClone(x.state),html=x.tools.pages.services();
 for(const text of ['All services','Hair','Nails','No category','Cut &amp; finish','1 hr 15 min','£48.00','Needs staff'])assert(html.includes(text),text);
 assert.equal((html.match(/class="jg-service-record"/g)||[]).length,3);assert(html.includes('aria-label="Service category"'));assert(html.includes('aria-label="Edit Cut &amp; finish"'));
 for(const action of ['add-service','edit-service','remove-service','add-category','edit-category','delete-category'])assert(html.includes('data-action="'+action+'"'),action);
 assert.deepEqual(x.state,before);
});
test('status derives from active assigned staff without a fabricated service toggle',()=>{
 const x=setup(),html=x.tools.pages.services();assert.equal((html.match(/class="sm-status is-bookable"/g)||[]).length,1);assert.equal((html.match(/class="sm-status needs-staff"/g)||[]).length,2);assert(!html.includes('type="checkbox"'));
});
test('category filters are read-only, recover from category removal and reset per tenant',()=>{
 const x=setup();x.tools.pages.services();assert.equal(x.tools.click('sm-category',{dataset:{category:'nails'}}),true);let html=x.tools.pages.services();assert(html.includes('Gel manicure'));assert(!html.includes('Cut &amp; finish'));assert.equal(x.renders,1);
 x.state.categories=x.state.categories.filter(c=>c.id!=='nails');html=x.tools.pages.services();assert(html.includes('Cut &amp; finish'));assert(html.includes('value="all" selected'));
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
 const html=x.tools.pages.services();assert(html.includes('value="skin" selected'));
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
 assert(html.includes('value="hair" selected'));assert(html.includes('data-service-id="new-service"'));
 assert(!html.includes('data-service-category="nails"'));
});

test('uncategorised saves stay visible and removing the last ungrouped service resets the invisible filter',()=>{
 const x=setup();x.tools.pages.services();assert.equal(x.tools.revealService('other'),true);
 let html=x.tools.pages.services();assert(html.includes('value="__uncategorised__" selected'));
 assert.equal(x.tools.creationCategory(),'');x.state.services=x.state.services.filter(s=>s.id!=='other');
 html=x.tools.pages.services();assert(html.includes('value="all" selected'));
 assert(!html.includes('value="__uncategorised__"'));
});

test('save reveal hooks reject missing records and stale business identities without changing filters',()=>{
 const x=setup();x.tools.pages.services();x.tools.click('sm-category',{dataset:{category:'nails'}});
 assert.equal(x.tools.revealCategory('missing'),false);assert.equal(x.tools.revealService('missing'),false);
 assert(x.tools.pages.services().includes('value="nails" selected'));
 x.setState({...x.state,id:'business-b'});
 assert.equal(x.tools.revealCategory('hair','business-a'),false);assert.equal(x.tools.revealService('cut','business-a'),false);
 assert(x.tools.pages.services().includes('value="all" selected'));
 assert.equal(x.tools.creationCategory(),'');
});

test('service search filters the full list before pagination and resets when the business changes',()=>{
 const x=setup();
 for(let i=0;i<25;i++)x.state.services.push({id:'extra-'+i,name:i===24?'Unique final service':'Extra service '+i,duration:30,price:20,categoryId:'hair',staffIds:['a']});
 let html=x.tools.pages.services();assert.equal((html.match(/class="jg-service-record"/g)||[]).length,20);assert(!html.includes('Unique final service'));
 const before=structuredClone(x.state);assert.equal(x.tools.input({id:'sm-service-search',value:'Unique final',selectionStart:12}),true);
 html=x.tools.pages.services();assert(html.includes('Unique final service'));assert.equal((html.match(/class="jg-service-record"/g)||[]).length,1);assert(!html.includes('jg-pagination'));assert.deepEqual(x.state,before);
 x.tools.input({id:'sm-service-search',value:'no matching service'});assert(x.tools.pages.services().includes('No matching services'));
 x.setState({...x.state,id:'business-b'});html=x.tools.pages.services();assert(html.includes('Cut &amp; finish'));assert(html.includes('value=""'));
});

test('category sections collapse without modifying records and reopen when revealing a saved service',()=>{
 const x=setup();x.tools.pages.services();const before=structuredClone(x.state);
 assert.equal(x.tools.click('sm-toggle-category',{dataset:{category:'hair'}}),true);
 let html=x.tools.pages.services();assert(html.includes('aria-expanded="false"'));assert(html.includes('id="sm-services-hair" hidden'));
 assert.equal(x.tools.revealService('cut'),true);html=x.tools.pages.services();assert(html.includes('aria-expanded="true"'));assert(!html.includes('id="sm-services-hair" hidden'));assert.deepEqual(x.state,before);
 assert.equal(x.tools.click('sm-toggle-category',{dataset:{category:'missing'}}),false);
});

test('a saved service beyond page one is revealed after its category changes the pagination scope',()=>{
 const x=setup();for(let i=0;i<24;i++)x.state.services.push({id:'added-'+i,name:'Service '+i,duration:30,price:20,categoryId:'hair',staffIds:['a']});
 x.tools.pages.services();x.tools.click('sm-category',{dataset:{category:'nails'}});x.tools.pages.services();
 assert.equal(x.tools.revealService('added-23'),true);const html=x.tools.pages.services();
 assert(html.includes('value="hair" selected'));assert(html.includes('data-service-id="added-23"'));assert(html.includes('Page 2 of 2'));assert((html.match(/class="jg-service-record"/g)||[]).length<=20);
});
