import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const websiteSource=await readFile(new URL('../business-website.cjs',import.meta.url),'utf8');
const workspaceSource=(await readFile(new URL('../workspace.js',import.meta.url),'utf8')).split('/* Reference-led owner presentation.')[0];
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const picker={markup:(name,label,description,value)=>`<input name="${name}" value="${value}">`};
const fixture=()=>({id:'20000000-0000-4000-8000-000000000001',name:'Fictional Studio',slug:'fictional-studio',color:'#242424',staff:[],services:[],workspace:{},entitlements:{offer_version:'2026-11-free-v1',plan:'free'}});
function panelRoot(attribute,ids){
 const focus={focus(){}};const nodes={'.bw-settings-home':{hidden:false},'.bw-settings-detail':{hidden:true},'.bw-settings-title':{innerHTML:''},'.bw-settings-back':focus,'[data-action=bw-setting]':focus,'[data-action=ws-booking-setting]':focus};
 return {dataset:{},panels:ids.map(id=>({dataset:{[attribute]:id},hidden:true})),querySelector:selector=>nodes[selector],querySelectorAll(){return this.panels;},scrollIntoView(){}};
}

test('website settings keep one original form and all fields across six screens',()=>{
 const s=fixture(),context={window:{JovaColourPicker:picker},URL,Intl,Date,document:{addEventListener(){},querySelector:()=>null}},seen={renders:0};
 vm.runInNewContext(websiteSource,context);
 const tools=context.window.JovaBusinessWebsite.create({salon:()=>s,esc:escape,ownerIdentity:()=> 'owner',bookingLink:()=> 'https://example.test/studio/book',render:()=>seen.renders++});
 let html=tools.editor();assert.equal((html.match(/data-form="bw-website"/g)||[]).length,1);
 assert.equal((html.match(/class="bw-settings-option"/g)||[]).length,6);
 for(const name of ['headline','about','brandColor','headingColor','template','showInSearch','hideAddress'])assert.ok(html.includes('name="'+name+'"'));
 assert.match(html,/data-bw-section="hours"/);assert.match(html,/href="#availability"/);assert.match(html,/href="#settings"/);
 const form={dataset:{owner:'owner|'+s.id},querySelector:()=>null};
 tools.input({name:'headline',value:'My unsaved headline',closest:()=>form});
 const root=panelRoot('bwSection',['design','hero','about','colours','hours','search']);
 for(const section of ['hero','about','colours','search','home','design']){
  assert.equal(tools.click('bw-setting',{dataset:{section},closest:()=>root}),true);
  assert.equal(root.dataset.bwView,section);
  assert.deepEqual(root.panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.bwSection),section==='home'?[]:[section]);
 }
 assert.equal(seen.renders,0,'Opening settings must not replace live form elements');
 assert.ok(tools.isDirty());html=tools.editor();assert.ok(html.includes('My unsaved headline'));assert.match(html,/data-bw-view="design"/);
});

test('website and booking tabs preserve both forms while Save submits only the active form',()=>{
 const s=fixture(),seen={renders:0,websiteSaves:0,bookingSaves:0};
 const nav={dataset:{}},tabs=['website','booking'].map(id=>({dataset:{section:id},setAttribute(){},tabIndex:0}));
 const websitePanel={hidden:false},bookingPanel={hidden:true};
 const websiteForm={querySelector:()=>null,requestSubmit:()=>seen.websiteSaves++},bookingForm={querySelector:()=>null,requestSubmit:()=>seen.bookingSaves++};
 const context={window:{JovaColourPicker:picker},URL,location:{origin:'https://example.test',pathname:'/',hash:''},document:{addEventListener(){},querySelector:selector=>selector==='.jg-personalise-nav'?nav:selector==='[data-form=bw-website]'?websiteForm:selector==='[data-form=ws-booking-page]'?bookingForm:null,querySelectorAll:()=>tabs,getElementById:id=>id==='personalise-website'?websitePanel:bookingPanel}};
 vm.runInNewContext(workspaceSource,context);
 const tools=context.window.JovaWorkspace.create({salon:()=>s,esc:escape,render:()=>seen.renders++,field:(label,name,value)=>`<input name="${name}" value="${value}">`,money:String,website:{editor:()=>'<form data-form="bw-website"></form>',isBusy:()=>false},bookingLink:()=> 'https://example.test/studio/book'});
 const html=tools.pages.scheduling();assert.match(html,/data-navigation="panels"/);assert.equal((html.match(/class="bw-settings-option"/g)||[]).length,3);
 assert.doesNotMatch(html,/data-action="workspace-appearance"/);assert.match(html,/data-booking-section="content" hidden/);
 tools.click('ws-save-personalise',{});assert.equal(seen.websiteSaves,1);assert.equal(seen.bookingSaves,0);
 tools.click('ws-personalise-section',{dataset:{section:'booking'}});assert.equal(websitePanel.hidden,true);assert.equal(bookingPanel.hidden,false);
 tools.click('ws-save-personalise',{});assert.equal(seen.websiteSaves,1);assert.equal(seen.bookingSaves,1);
 tools.click('ws-personalise-section',{dataset:{section:'website'}});assert.equal(websitePanel.hidden,false);assert.equal(bookingPanel.hidden,true);
 assert.equal(seen.renders,0,'Tabs must preserve independent form drafts without a rerender');
});

test('booking setting navigation keeps controls mounted and rejects unknown panels',()=>{
 const s=fixture(),context={window:{JovaColourPicker:picker},URL,location:{origin:'https://example.test',pathname:'/',hash:''}};
 vm.runInNewContext(workspaceSource,context);
 const tools=context.window.JovaWorkspace.create({salon:()=>s,esc:escape}),root=panelRoot('bookingSection',['appearance','content','options']);
 for(const section of ['appearance','content','options','home']){
  tools.click('ws-booking-setting',{dataset:{section},closest:()=>root});
  assert.equal(root.dataset.bookingView,section);
  assert.deepEqual(root.panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.bookingSection),section==='home'?[]:[section]);
 }
 tools.click('ws-booking-setting',{dataset:{section:'fake-notifications-toggle'},closest:()=>root});assert.equal(root.dataset.bookingView,'home');
});

test('expanded previews use current drafts and restore background scrolling without saving',()=>{
 const s=fixture(),scroller={style:{overflow:'auto'}},body={style:{overflow:''},append(dialog){active=dialog;}};let active=null,focused=0;
 const document={body,addEventListener(){},getElementById:()=>({innerHTML:'<article class="ws-booking-preview">Actual booking draft</article>'}),querySelector:selector=>selector==='.bw-live-preview-dialog'?active:selector==='.workspace-main'?scroller:null,createElement(){const events={},button={addEventListener(){}};return {className:'',innerHTML:'',setAttribute(){},querySelector:()=>button,addEventListener:(name,handler)=>events[name]=handler,showModal(){this.open=true;},close(){events.close();},remove(){active=null;}};}};
 const context={window:{JovaColourPicker:picker},URL,Intl,Date,document};vm.runInNewContext(websiteSource,context);
 const tools=context.window.JovaBusinessWebsite.create({salon:()=>s,esc:escape,ownerIdentity:()=> 'owner',bookingLink:()=> 'https://example.test/studio/book'}),form={dataset:{owner:'owner|'+s.id},querySelector:()=>null};
 tools.editor();tools.input({name:'headline',value:'Unsaved preview headline',closest:()=>form});
 const trigger={isConnected:true,focus(){focused++;}};
 tools.click('bw-live-preview',trigger);assert.ok(active.open);assert.match(active.innerHTML,/Unsaved preview headline/);assert.equal(scroller.style.overflow,'hidden');assert.equal(body.style.overflow,'hidden');
 const current=active;tools.click('bw-live-preview',trigger);assert.equal(active,current,'One preview dialog at a time');
 active.close();assert.equal(active,null);assert.equal(scroller.style.overflow,'auto');assert.equal(body.style.overflow,'');assert.equal(focused,1);assert.ok(tools.isDirty());
 tools.click('bw-live-booking-preview',trigger);assert.match(active.innerHTML,/Actual booking draft/);active.close();assert.ok(tools.isDirty());
});
