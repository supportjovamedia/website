/* Fictional browser-only demo records. No network, delivery or payment side effects. */
(() => {
 'use strict';
 const VERSION=1,DEMO_ID='drink',DEMO_SLUG='jova-demo';
 const copy=value=>JSON.parse(JSON.stringify(value));
 const key=date=>date.toISOString().slice(0,10);
 const plus=(value,days)=>{const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return key(date);};
 const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
 const clock=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
 const builtIn=salon=>!!salon&&salon.id===DEMO_ID&&salon.slug===DEMO_SLUG;
 function instant(at){const date=new Date(at??Date.now());if(!Number.isFinite(date.getTime()))throw new RangeError('Choose a valid sample-data date.');return date;}
 function context(at){const date=instant(at),parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);return {date,anchor:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date),nowMinutes:minutes(parts)};}
 const schedule=(start,end,days)=>({start,end,days,weekly:Object.fromEntries(Array.from({length:7},(_,day)=>[String(day),{start:day===0?'10:00':start,end:day===0?'16:00':end,closed:!days.includes(day)}]))});
 function day(hours,weekday){const h=hours||{},o=h.weekly?.[String(weekday)],start=o?.start??h.start??'09:00',end=o?.end??h.end??'18:00';return {start,end,closed:o?o.closed===true:!(h.days||[]).includes(weekday)};}
 function hoursFor(salon,member,date){const weekday=new Date(date+'T12:00:00Z').getUTCDay(),business=day(salon.hours,weekday),staff=member.hours==null?business:day(member.hours,weekday),start=business.start>staff.start?business.start:staff.start,end=business.end<staff.end?business.end:staff.end;return {start,end,closed:member.active===false||business.closed||staff.closed||start>=end};}
 const clientNames=['Amelia Clarke','Priya Shah','Olivia Taylor','Sophie Martin','Grace Williams','Aisha Khan','Emily Roberts','Maya Patel','Isla Thompson','Zara Ahmed','Freya Wilson','Charlotte Evans','Lily Davies','Ella Murphy','Nadia Ali','Hannah Brooks','Evelyn James','Ruby Bennett','Fatima Hussain','Mia Campbell','Chloe Reed','Sienna Collins','Leila Hassan','Alice Turner','Harper Mitchell','Jessica Ward','Daisy Cooper','Imogen Hughes','Poppy Morgan','Anaya Mehta','Leo Harris','Oliver Parker','Ethan Scott','Noah Foster','Theo Bailey','Daniel Green','Adam Lewis','Jack Robinson','Yusuf Rahman','Lucas Wood'];
 function records(){
  const staff=[{id:'owner',name:'Sam Taylor',role:'Owner',active:true,color:'#287c91',hours:null},{id:'demo-staff-amira',name:'Amira Khan',role:'Beauty therapist',active:true,color:'#8d51a3',hours:schedule('10:00','18:00',[0,3,4,5,6])},{id:'demo-staff-ellie',name:'Ellie Bennett',role:'Nail technician',active:true,color:'#c17b32',hours:schedule('09:00','17:00',[0,1,2,4,5,6])},{id:'demo-staff-noah',name:'Noah Reed',role:'Stylist',active:true,color:'#318e66',hours:schedule('10:00','18:00',[0,1,2,3,5,6])}];
  const categories=[{id:'cat-brows',name:'Brows & lashes'},{id:'cat-nails',name:'Nails'},{id:'demo-cat-hair',name:'Hair'},{id:'demo-cat-skin',name:'Skin & beauty'}];
  const services=[{id:'brows',name:'Brow shape & tint',price:25,duration:30,categoryId:'cat-brows',staffIds:['owner']},{id:'lashes',name:'Lash lift',price:55,duration:60,categoryId:'cat-brows',staffIds:['owner']},{id:'nails',name:'Gel manicure',price:35,duration:45,categoryId:'cat-nails',staffIds:['owner']},{id:'demo-service-cut',name:'Cut & finish',price:48,duration:45,categoryId:'demo-cat-hair',staffIds:['demo-staff-noah']},{id:'demo-service-style',name:'Blow dry & style',price:32,duration:30,categoryId:'demo-cat-hair',staffIds:['demo-staff-noah']},{id:'demo-service-lamination',name:'Brow lamination',price:45,duration:45,categoryId:'cat-brows',staffIds:['demo-staff-amira']},{id:'demo-service-pedicure',name:'Luxury pedicure',price:48,duration:60,categoryId:'cat-nails',staffIds:['demo-staff-ellie']},{id:'demo-service-facial',name:'Express facial',price:40,duration:30,categoryId:'demo-cat-skin',staffIds:['demo-staff-amira']}];
  const customers=clientNames.map((name,index)=>({id:'demo-client-'+String(index+1).padStart(2,'0'),name,email:'client'+String(index+1).padStart(2,'0')+'@jovabook.example.test',phone:'07700 900'+String(index).padStart(3,'0'),notes:index%7===0?'Sample client. Prefers afternoon bookings.':'Sample client.'}));
  return {staff,categories,services,customers};
 }
 const append=(existing,incoming)=>{const rows=Array.isArray(existing)?existing:[],ids=new Set(rows.map(item=>item.id));return [...rows,...incoming.filter(item=>!ids.has(item.id))];};
 function makeBookings(salon,ctx){
  const result=[],existing=Array.isArray(salon.bookings)?salon.bookings:[];
  let serial=0;
  for(let offset=-28;offset<=14;offset++){
   const date=plus(ctx.anchor,offset),weekday=new Date(date+'T12:00:00Z').getUTCDay(),business=day(salon.hours,weekday);if(business.closed)continue;
   const pairs=salon.staff.flatMap(member=>{const hours=hoursFor(salon,member,date);return hours.closed?[]:salon.services.filter(service=>service.duration>0&&(service.staffIds||[]).includes(member.id)).map(service=>({member,service,hours}));});if(!pairs.length)continue;
   const target=offset===0?9:offset<0?5+(weekday%3):6+(weekday%3),limit=minutes(business.end);
   let cursor=minutes(business.start)+(weekday%3)*15;
   for(let index=0;index<target&&cursor<limit;index++){
    let chosen=null;
    for(let trial=0;trial<pairs.length;trial++){
     const pair=pairs[(index*3+weekday+trial)%pairs.length],start=Math.max(cursor,minutes(pair.hours.start)),end=start+Number(pair.service.duration);if(end>minutes(pair.hours.end)||end>limit)continue;
     const conflicts=existing.filter(booking=>booking.date===date&&booking.status!=='cancelled'&&start<minutes(booking.time)+Number(booking.duration)&&end>minutes(booking.time));
     if(conflicts.length){cursor=Math.max(cursor,...conflicts.map(booking=>minutes(booking.time)+Number(booking.duration)))+10;trial=-1;if(cursor>=limit)break;continue;}
     chosen={...pair,start,end};break;
    }
    if(!chosen)break;
    const {member,service,start,end}=chosen,customer=salon.customers[(serial*7+weekday)%salon.customers.length];
    const cycle=(serial+weekday)%23;let status=date<ctx.anchor?'completed':date>ctx.anchor?'confirmed':end<=ctx.nowMinutes?'completed':'confirmed';if(cycle===3)status='cancelled';else if(cycle===11&&(date<ctx.anchor||(date===ctx.anchor&&end<=ctx.nowMinutes)))status='no_show';
    const id='demo-booking-'+date+'-'+String(index+1).padStart(2,'0');
    if(!existing.some(booking=>booking.id===id))result.push({id,serviceId:service.id,serviceName:service.name,price:Number(service.price),duration:Number(service.duration),date,time:clock(start),staffId:member.id,customerId:customer.id,name:customer.name,email:customer.email,phone:customer.phone,notes:serial%9===0?'Sample booking. Client prefers a quiet service.':'Sample booking.',status,source:serial%4===0?'Manual':'Online',deposit:0});
    cursor=end+(index%2===0?10:15);serial++;
   }
  }
  return result;
 }
 function makeEvents(bookings,ctx,salon){
  const future=bookings.filter(booking=>booking.status==='confirmed'&&booking.date>=ctx.anchor),cancelled=bookings.filter(booking=>booking.status==='cancelled'),recent=bookings.filter(booking=>booking.date>=plus(ctx.anchor,-7));
  const rows=[];
  for(let index=0;index<24;index++){
   const kind=['confirmed','cancelled','rescheduled','confirmed'][index%4],pool=kind==='cancelled'?cancelled:kind==='rescheduled'?future:recent,booking=pool[pool.length-1-(Math.floor(index/4)%Math.max(pool.length,1))];if(!booking)continue;
   rows.push({id:'demo-update-'+ctx.anchor+'-'+String(index+1).padStart(2,'0'),kind,subject:salon.name+': '+({confirmed:'new booking',cancelled:'booking cancelled',rescheduled:'booking rescheduled'})[kind],to:booking.email,from:'JovaBook demo <bookings@jovabook.example.test>',reply:'hello@jovabook.example.test',at:new Date(ctx.date.getTime()-(index*11+2)*60000).toISOString(),booking:copy(booking),salonName:salon.name,address:salon.address||'',status:'Demo preview only'});
  }
  return rows;
 }
 function populate(salon,{at,fresh=false}={}){
  if(!builtIn(salon))return {applied:false,reason:'Not the built-in demo salon.'};
  if(Number(salon.demo?.sampleVersion)>=VERSION)return {applied:false,reason:'Sample records already loaded.'};
  const ctx=context(at),sample=records(),next=copy(salon),before=Object.fromEntries(['staff','services','customers','bookings','emails'].map(name=>[name,Array.isArray(salon[name])?salon[name].length:0]));
  if(fresh||!next.hours)next.hours=schedule('09:00','18:00',[0,1,2,3,4,5,6]);
  for(const name of ['staff','categories','services','customers'])next[name]=append(next[name],sample[name]);
  const bookings=makeBookings(next,ctx);next.bookings=append(next.bookings,bookings);next.emails=append(next.emails,makeEvents(bookings,ctx,next));
  next.plan='standard';next.entitlements={...next.entitlements,plan:'standard'};next.subscription={...next.subscription,plan:'Standard'};
  next.demo={...next.demo,sampleVersion:VERSION,sampleAnchor:ctx.anchor,sample:true,label:'Sample salon · Standard preview'};
  Object.assign(salon,next);
  return {applied:true,anchor:ctx.anchor,added:{staff:next.staff.length-before.staff,services:next.services.length-before.services,clients:next.customers.length-before.customers,bookings:next.bookings.length-before.bookings,updates:next.emails.length-before.emails},counts:{staff:next.staff.length,services:next.services.length,clients:next.customers.length,bookings:next.bookings.length,updates:next.emails.length}};
 }
 function build({at}={}){
  const salon={id:DEMO_ID,name:'Jova Demo Studio',slug:DEMO_SLUG,color:'#318d75',initials:'JD',owner:'Sam Taylor',email:'hello@jovabook.example.test',phone:'020 7946 0123',address:'24 High Street, London',about:'A fictional studio for exploring JovaBook. All clients and bookings are samples.',buffer:0,notice:0,staff:[],categories:[],services:[],customers:[],bookings:[],emails:[],sms:[],subscription:{status:'active',plan:'Standard',method:'Demo preview only'},payments:{stage:0,enabled:false,deposit:0,transactions:[]},usage:{sms:0,ai:0},workspace:{}};
  populate(salon,{at,fresh:true});return salon;
 }
 const api={build,populate,isBuiltIn:builtIn,version:VERSION};
 if(typeof window!=='undefined')window.JovaDemoData=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
