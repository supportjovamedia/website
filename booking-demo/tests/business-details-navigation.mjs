import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8'),navigation=await readFile(new URL('../business-details-polish.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function businessSettings(){'),app.indexOf('async function persistBusinessDetails('));

test('Business details keeps one real save form and only supported settings fields',()=>{
 const salon={id:'fictional',name:'Fictional Studio',about:'Owner description',color:'#242424',bookings:[],address:'Address',phone:'0123456789',email:'owner@example.test'};
 const context={salon:()=>salon,isLive:()=>false,schedulingSupported:()=>true,businessSettingsSaving:false,businessSettingsSaveOwner:'',businessOwner:()=> 'demo|fictional',route:()=> 'settings',window:{},esc:String,dashboardSetupStep:()=>'',ownerAccessState:null,bookingLink:()=> 'https://example.test/studio/book',field:(label,name,value)=>`<label>${label}<input name="${name}" value="${value}"></label>`,JovaBusinessLocale:{fields:()=>'<select name="country"><option>GB</option></select><select name="timezone"><option>Europe/London</option></select><select name="currency"><option>GBP</option></select>'},workspace:{businessHoursFields:()=>'<div class="ws-daily"><input name="day_1_start" value="09:00"></div><details class="ws-details"><summary>Booking rules</summary><div class="ws-two ws-gap-top"><input name="buffer" value="0"><input name="notice" value="0"></div><p class="ws-help">Real booking rules.</p></details>'}};
 vm.runInNewContext(source,context);const html=context.businessSettings();
 assert.equal((html.match(/<form /g)||[]).length,1);assert.match(html,/data-form="settings"/);assert.match(html,/data-bd-save/);
 for(const name of ['name','about','country','timezone','currency','address','phone','email','day_1_start','buffer','notice'])assert.equal((html.match(new RegExp('name="'+name+'"','g'))||[]).length,1,name+' appears once');
 for(const id of ['home','information','hours','rules'])assert.match(html,new RegExp('data-bd-section="'+id+'"'));
 assert.equal((html.match(/class="bd-option"/g)||[]).length,3);assert.doesNotMatch(html,/data-bd-copy|data-bd-section="booking"/);assert.match(html,/data-action="export"/);
 assert.ok(!html.includes('<details class="ws-details">'),'Rules are editable directly in their own screen');
 assert.ok(!html.includes('Show QR code'));assert.ok(!html.includes('prevent_last_minute'));assert.ok(!html.includes('advance_booking'));
});

test('section switches keep mounted draft fields and invalid fields reveal their section',()=>{
 const handlers={},title={textContent:'Business details',focus(){}},back={hidden:true},save={hidden:true};
 const panels=['home','information','hours','rules'].map(id=>({dataset:{bdSection:id},hidden:id!=='home'}));
 const draftField={value:'Unsaved business name'},root={dataset:{bdOwner:'owner|fictional',businessView:'home'},querySelectorAll:()=>panels,querySelector:selector=>selector==='[data-bd-title]'?title:selector==='.bd-back'?back:save,closest:()=>({scrollTop:100})};
 const context={document:{readyState:'loading',addEventListener:(name,handler)=>handlers[name]=handler,querySelector:()=>root},window:{},requestAnimationFrame:()=>{}};
 vm.runInNewContext(navigation,context);const tools=context.window.JovaBusinessDetails;
 assert.equal(tools.view('owner|fictional','settings'),'home');
 for(const id of ['information','hours','rules','home']){assert.equal(tools.open(id),true);assert.deepEqual(panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.bdSection),[id]);assert.equal(draftField.value,'Unsaved business name');}
 handlers.invalid({target:{closest:()=>panels[1]}});assert.equal(root.dataset.businessView,'information');assert.equal(save.hidden,false);
 assert.equal(tools.open('unsupported'),false);assert.equal(tools.view('different-owner','availability'),'hours');
});

