import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('Share dialog, website editor, Booking page and iframe use the public website and direct booking addresses',async()=>{
 const location=new URL('https://book.jovamedia.com/#scheduling'),copied=[],modals=[];
 const s={id:'20000000-0000-4000-8000-000000000001',slug:'arooj',name:'Arooj Studio',color:'#235789',services:[{id:'cut',name:'Haircut',price:25,duration:30,staffIds:['owner']}],staff:[{id:'owner',name:'Owner',active:true}],categories:[],bookings:[],workspace:{}};
 const window={location,JovaColourPicker:{markup:()=>''},JovaDemoData:{isBuiltIn:()=>false}},context={window,location,URL,URLSearchParams,Date,Intl,Blob,File,Uint8Array,s,JovaDemoData:window.JovaDemoData,navigator:{clipboard:{writeText:async value=>copied.push(value)}},setTimeout,clearTimeout};
 const load=async file=>vm.runInNewContext(await readFile(new URL('../booking-demo/'+file,import.meta.url),'utf8'),context);
 await load('public-links.js');context.JovaPublicLinks=window.JovaPublicLinks;
 const app=await readFile(new URL('../booking-demo/app.js',import.meta.url),'utf8'),definition=app.match(/const bookingLink=.*;\r?\n/)[0];
 const bookingLink=vm.runInNewContext(definition+'bookingLink;',context);
 context.businessWebsite={websiteLink:salon=>window.JovaPublicLinks.website(salon.slug)};
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 Object.assign(context,{a:'share-booking-link',bookingLink,esc,bookingSetupWarning:()=>'',modal:(title,html)=>modals.push({title,html})});
 vm.runInNewContext('(()=>{'+app.slice(app.indexOf(" if(a==='share-booking-link')"),app.indexOf(" if(a==='workspace-appearance')"))+'})()',context);
 assert.equal(modals[0].title,'Share your links');
 assert.match(modals[0].html,/data-target="website" aria-label="Copy website link">Copy<\/button>.*<details><summary>See more<\/summary>.*id="share-website" readonly value="https:\/\/www\.jovamedia\.com\/book\/arooj"/);
 assert.match(modals[0].html,/data-target="booking" aria-label="Copy booking link">Copy<\/button>.*id="share-booking" readonly value="https:\/\/www\.jovamedia\.com\/book\/arooj\/appointments"/);
 await load('scheduling-core.cjs');await load('business-website.cjs');vm.runInNewContext((await readFile(new URL('../booking-demo/workspace.js',import.meta.url),'utf8')).split('/* Reference-led owner presentation.')[0],context);
 const api={salon:()=>s,bookingLink,ownerIdentity:()=> 'fixture-owner',esc,field:()=>'',money:v=>'£'+v,toast(){},modal(){},save(){},render(){}};
 const website=window.JovaBusinessWebsite.create(api);api.website=website;
 const workspace=window.JovaWorkspace.create(api),personalise=workspace.pages['booking-setup'](),editor=website.editor();
 assert(personalise.includes('value="https://www.jovamedia.com/book/arooj/appointments"'));
 assert(personalise.includes('src=&quot;https://www.jovamedia.com/book/arooj/appointments&quot;'));
 assert(personalise.includes('value="https://www.jovamedia.com/book/arooj"'));
 assert.doesNotMatch(personalise,/Links to individual services|ws-copy-service/);
 for(const [target,value] of [['link','https://www.jovamedia.com/book/arooj/appointments'],['website','https://www.jovamedia.com/book/arooj']]){
  workspace.click('ws-copy',{dataset:{target},closest:()=>({querySelector:()=>({value})})});
  assert.equal(copied.at(-1),value);
 }
 assert(editor.includes('value="https://www.jovamedia.com/book/arooj"'));assert(editor.includes('value="https://www.jovamedia.com/book/arooj/appointments"'));
 assert.equal(window.JovaPublicLinks.addressLabel('arooj'),'jovamedia.com/book/arooj');
 for(const html of [modals[0].html,personalise,editor])assert(!html.includes('book.jovamedia.com/arooj'));
});
