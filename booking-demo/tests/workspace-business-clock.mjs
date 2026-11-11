import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const localeSource=await readFile(new URL('../business-locale.js',import.meta.url),'utf8');
const dashboardSource=await readFile(new URL('../dashboard-core.js',import.meta.url),'utf8');
const scheduleSource=await readFile(new URL('../scheduling-core.cjs',import.meta.url),'utf8');
const workspaceSource=await readFile(new URL('../workspace.js',import.meta.url),'utf8');
const referenceSource=workspaceSource.slice(workspaceSource.indexOf('/* Reference-led owner presentation.'),workspaceSource.indexOf('/* vanilla-colorful'));

function renderAt(instant,{country='US',timezone='America/Los_Angeles',bookings,staffIds=null,anchor=null,view='day'}={}){
 class FixedDate extends Date{constructor(...args){if(args.length)super(...args);else super(instant);}static now(){return Date.parse(instant);}}
 const context={window:{},Date:FixedDate,Intl};
 for(const source of [localeSource,scheduleSource,dashboardSource,referenceSource])vm.runInNewContext(source,context);
 const s={id:'fictional-studio',country,timezone,currency:country==='GB'?'GBP':'USD',owner:'Fictional Owner',staff:[{id:'owner',name:'Fictional Owner',active:true},{id:'other',name:'Other Staff',active:true}],services:[],customers:[],bookings};
 const day=context.window.JovaBusinessLocale.clock(s).date;
 const renderer=context.window.JovaReference.create({salon:()=>s,today:()=>day,esc:String,money:value=>String(value),humanDate:String});
 const stats=context.window.JovaDashboard.summary(s,{date:anchor||day,view,staffIds});
 return renderer.dashboard({stats,rows:bookings.filter(b=>context.window.JovaDashboard.inRange(stats.range,b.date)),controls:'',staffIds});
}
const booking=(id,date,time,{status='confirmed',staffId='owner',duration=30}={})=>({id,date,time,status,staffId,duration,price:25,serviceId:'service',serviceName:'Consultation',name:id});

test('Los Angeles dashboard uses business-local greeting, next appointment and in-progress marker',()=>{
 const html=renderAt('2026-11-06T18:15:00Z',{bookings:[booking('Current client','2026-11-06','10:00'),booking('Next client','2026-11-06','10:30'),booking('Later client','2026-11-06','18:30')]});
 assert.match(html,/Good morning, Fictional/);
 assert.match(html,/next today at 10:30/);
 assert.doesNotMatch(html,/next today at 18:30/);
 assert.equal((html.match(/is-in-progress/g)||[]).length,1);
 assert.match(html,/is-in-progress[^]*?Current client/);
});

test('business date remains yesterday in Los Angeles after London midnight and respects selected staff',()=>{
 const html=renderAt('2026-11-07T02:15:00Z',{staffIds:['owner'],bookings:[booking('Past LA client','2026-11-06','10:00'),booking('Other staff client','2026-11-06','18:20',{staffId:'other'}),booking('Cancelled client','2026-11-06','18:25',{status:'cancelled'}),booking('Next LA client','2026-11-06','18:30'),booking('Tomorrow client','2026-11-07','09:00')]});
 assert.match(html,/Good evening, Fictional/);
 assert.match(html,/next today at 18:30/);
 assert.doesNotMatch(html,/next today at 10:00|next today at 18:20|next today at 18:25|next today at 09:00/);
 assert.doesNotMatch(html,/is-in-progress/);
});

test('Dashboard caption follows the selected week or month rather than always claiming the current period',()=>{
 for(const [view,anchor,caption] of [['week','2026-11-09','this week'],['week','2026-11-16','next week'],['week','2026-11-02','last week'],['week','2026-12-07','in the selected week'],['month','2026-11-01','this month'],['month','2026-12-01','next month'],['month','2026-10-01','last month'],['month','2027-02-01','in the selected month']]){
  const html=renderAt('2026-11-09T12:00:00Z',{bookings:[],view,anchor,country:'GB',timezone:'Europe/London'});assert(html.includes('<strong>0 appointments</strong> '+caption),caption);
 }
});
