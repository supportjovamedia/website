/* Business wall times remain local to the saved IANA zone, never the viewer's device. */
((root) => {
 'use strict';
 const countries={GB:{name:'United Kingdom',currency:'GBP',zone:'Europe/London'},US:{name:'United States',currency:'USD',zone:'America/New_York'}};
 const zones={
  GB:['Europe/London'],
  US:['America/New_York','America/Detroit','America/Kentucky/Louisville','America/Kentucky/Monticello','America/Indiana/Indianapolis','America/Indiana/Vincennes','America/Indiana/Winamac','America/Indiana/Marengo','America/Indiana/Petersburg','America/Indiana/Vevay','America/Chicago','America/Indiana/Tell_City','America/Indiana/Knox','America/Menominee','America/North_Dakota/Center','America/North_Dakota/New_Salem','America/North_Dakota/Beulah','America/Denver','America/Boise','America/Phoenix','America/Los_Angeles','America/Anchorage','America/Juneau','America/Sitka','America/Metlakatla','America/Yakutat','America/Nome','America/Adak','Pacific/Honolulu'],
 };
 const currencies=['GBP','USD'];
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const country=value=>['IM','JE','GG'].includes(value)?'GB':value;
 function validate(value){
  const code=country(String(value?.country||''));
  if(!Object.hasOwn(countries,code))throw Error('Choose a supported business country.');
  if(!zones[code].includes(value.timezone))throw Error('Choose a time zone in your business country.');
  try{new Intl.DateTimeFormat('en',{timeZone:value.timezone}).format();}catch{throw Error('Choose a valid business time zone.');}
  if(!currencies.includes(value.currency))throw Error('Choose GBP or USD for service prices.');
  return {country:code,timezone:value.timezone,currency:value.currency};
 }
 function resolve(salon){
  const saved={...(salon?.settings||{}),...salon};
  const inferred=Object.keys(zones).find(code=>zones[code].includes(saved.timezone));
  const code=country(saved.country||inferred||'GB'),base=countries[code]||countries.GB;
  try{return validate({country:code,timezone:saved.timezone||base.zone,currency:saved.currency||base.currency});}
  catch{return {country:'GB',timezone:'Europe/London',currency:'GBP'};}
 }
 const formatter=new Map(),offsetCache=new Map();
 function parts(instant,zone){
  if(!formatter.has(zone))formatter.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
  return Object.fromEntries(formatter.get(zone).formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
 }
 function clock(salon,now=Date.now()){
  const locale=resolve(salon),p=parts(now,locale.timezone);
  return {date:p.year+'-'+p.month+'-'+p.day,minutes:Number(p.hour)*60+Number(p.minute),...locale};
 }
 const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;const n=Date.parse(value+'T12:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value;};
 function instants(date,time,timezone){
  if(!validDate(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time||'')))return [];
  const target=Date.parse(date+'T'+time+':00Z'),key=timezone+'|'+date;
  try{
   let offsets=offsetCache.get(key);
   if(!offsets){offsets=new Set();for(let h=-48;h<=48;h+=6){const sample=target+h*3600000,p=parts(sample,timezone),wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);offsets.add(wall-sample);}if(offsetCache.size>400)offsetCache.clear();offsetCache.set(key,offsets);}
   return [...offsets].map(offset=>target-offset).filter(value=>{const p=parts(value,timezone);return p.year+'-'+p.month+'-'+p.day===date&&p.hour+':'+p.minute===time;}).sort((a,b)=>a-b);
  }catch{return [];}
 }
 function uniqueSlot(salon,date,time,duration=0){
  const zone=resolve(salon).timezone,start=instants(date,time,zone);
  if(start.length!==1||!Number.isInteger(duration)||duration<0)return false;
  if(!duration)return true;
  const wall=new Date(Date.parse(date+'T'+time+':00Z')+duration*60000),end=instants(wall.toISOString().slice(0,10),wall.toISOString().slice(11,16),zone);
  return end.length===1&&end[0]-start[0]===duration*60000;
 }
 const money=(value,salon)=>{const code=resolve(salon).currency;return new Intl.NumberFormat('en-GB',{style:'currency',currency:code,currencyDisplay:code==='GBP'?'symbol':'code'}).format(Number(value)||0);};
 function zoneLabel(salon,date){const zone=resolve(salon).timezone;try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date((validDate(date)?date:new Date().toISOString().slice(0,10))+'T12:00:00Z')).find(p=>p.type==='timeZoneName')?.value||zone;}catch{return zone;}}
 function fields(salon,{locked=false}={}){
  const v=resolve(salon),disabled=locked?' disabled':'';
  return '<div class="business-locale-fields"><label class="field">Business country<select name="country" required'+disabled+'>'+Object.entries(countries).map(([code,c])=>'<option value="'+code+'"'+(code===v.country?' selected':'')+'>'+c.name+'</option>').join('')+'</select></label><div class="grid two"><label class="field">Business time zone<select name="timezone" required'+disabled+'>'+zoneOptions(v.country,v.timezone)+'</select></label><label class="field">Service currency<select name="currency" required'+disabled+'>'+currencies.map(code=>'<option value="'+code+'"'+(code===v.currency?' selected':'')+'>'+code+'</option>').join('')+'</select></label></div><p class="tiny">Opening hours and customer appointments use this time zone. Service prices use the selected currency. JovaBook subscriptions are billed in GBP.'+(locked?' Contact support to change country, time zone or currency once appointments exist.':' Changing currency does not convert service prices.')+'</p></div>';
 }
 const zoneOptions=(code,selected)=>zones[country(code)].map(zone=>'<option value="'+zone+'"'+(zone===selected?' selected':'')+'>'+esc(zone.replaceAll('_',' '))+'</option>').join('');
 function read(data,salon){const current=resolve(salon);return validate({country:data.country??current.country,timezone:data.timezone??current.timezone,currency:data.currency??current.currency});}
 function countryChanged(select){if(select?.name!=='country'||!Object.hasOwn(countries,select.value)||!select.form)return false;const form=select.form,zone=form.elements.namedItem('timezone'),currency=form.elements.namedItem('currency'),defaults=countries[select.value];if(zone&&!zone.disabled)zone.innerHTML=zoneOptions(select.value,defaults.zone);if(currency&&!currency.disabled)currency.value=defaults.currency;return true;}
 const api={countries,zones,currencies,validate,resolve,clock,instants,uniqueSlot,money,zoneLabel,fields,read,countryChanged};
 root.JovaBusinessLocale=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
