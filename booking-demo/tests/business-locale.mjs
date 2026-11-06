import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const context={window:{},Intl,Date};
vm.runInNewContext(await readFile(new URL('../business-locale.js',import.meta.url),'utf8'),context);
vm.runInNewContext(await readFile(new URL('../scheduling-core.js',import.meta.url),'utf8'),context);
const locale=context.window.JovaBusinessLocale,schedule=context.window.JovaSchedule;
const plain=value=>JSON.parse(JSON.stringify(value));
const business=(country,timezone,currency)=>({country,timezone,currency});

test('legacy UK settings remain GBP and London while country and zone must agree',()=>{
 assert.deepEqual(plain(locale.resolve({})),{country:'GB',timezone:'Europe/London',currency:'GBP'});
 assert.deepEqual(plain(locale.read({},business('US','America/Los_Angeles','USD'))),{country:'US',timezone:'America/Los_Angeles',currency:'USD'});
 assert.equal(locale.resolve({settings:{country:'US',timezone:'America/Los_Angeles',currency:'USD'}}).timezone,'America/Los_Angeles');
 assert.deepEqual(Object.keys(locale.countries),['GB','US','CA','AU']);
 assert.deepEqual(Array.from(locale.currencies),['GBP','USD','CAD','AUD']);
 assert.throws(()=>locale.validate(business('US','America/Sao_Paulo','USD')),/time zone/);
 assert.throws(()=>locale.validate(business('IN','Asia/Kolkata','INR')),/country/);
 assert.throws(()=>locale.validate(business('FR','Europe/Paris','EUR')),/country/);
 assert.equal(locale.validate(business('AU','Australia/Sydney','AUD')).timezone,'Australia/Sydney');
 assert.equal(locale.validate(business('CA','America/Toronto','CAD')).currency,'CAD');
 assert.throws(()=>locale.validate(business('US','America/New_York','EUR')),/GBP/);
 assert.equal(locale.resolve({timezone:'America/New_York',currency:'USD'}).country,'US');
});

test('business clock handles different calendar days independently of device time',()=>{
 const now=Date.parse('2026-07-01T00:15:00Z');
 assert.equal(locale.clock(business('US','Pacific/Honolulu','USD'),now).date,'2026-06-30');
 assert.equal(locale.clock(business('US','Pacific/Honolulu','USD'),now).minutes,14*60+15);
 assert.equal(locale.clock(business('US','America/Los_Angeles','USD'),now).minutes,17*60+15);
 assert.equal(locale.clock(business('US','America/New_York','USD'),Date.parse('2026-01-01T02:00:00Z')).date,'2025-12-31');
});

test('spring gaps and repeated fall wall times are never offered as bookable unique slots',()=>{
 const ny=business('US','America/New_York','USD'),uk=business('GB','Europe/London','GBP');
 assert.equal(locale.instants('2026-03-08','02:30',ny.timezone).length,0);
 assert.equal(locale.instants('2026-11-01','01:30',ny.timezone).length,2);
 assert.equal(locale.uniqueSlot(ny,'2026-03-08','02:30',30),false);
 assert.equal(locale.uniqueSlot(ny,'2026-11-01','01:30',30),false);
 assert.equal(locale.uniqueSlot(ny,'2026-03-08','03:30',30),true);
 assert.equal(locale.uniqueSlot(uk,'2026-03-29','01:30',30),false);
 assert.equal(locale.uniqueSlot(uk,'2026-10-25','01:30',30),false);
 assert.equal(locale.uniqueSlot(ny,'2026-03-08','01:30',120),false);
 assert.equal(locale.uniqueSlot(uk,'2026-03-08','02:30',30),true);
 assert.equal(locale.uniqueSlot(ny,'2026-02-31','10:00',30),false);
});

test('service currency is explicit and does not alter the amount',()=>{
 assert.equal(locale.money(25,{}),'£25.00');
 assert.match(locale.money(25,business('US','America/New_York','USD')),/USD\s*25\.00/);
 assert.match(locale.money(25,business('CA','America/Toronto','CAD')),/CAD\s*25\.00/);
 assert.match(locale.money(25,business('AU','Australia/Adelaide','AUD')),/AUD\s*25\.00/);
});

test('restored Canada and Australia retain fractional offsets and local daylight saving',()=>{
 const now=Date.parse('2026-07-01T00:15:00Z');
 assert.equal(locale.clock(business('AU','Australia/Adelaide','AUD'),now).minutes,9*60+45);
 assert.equal(locale.clock(business('AU','Australia/Eucla','AUD'),now).minutes,9*60);
 assert.equal(locale.clock(business('CA','America/St_Johns','CAD'),Date.parse('2026-01-01T02:00:00Z')).date,'2025-12-31');
 assert.equal(locale.uniqueSlot(business('AU','Australia/Lord_Howe','AUD'),'2026-10-04','02:15',15),false);
 assert.equal(locale.uniqueSlot(business('AU','Australia/Lord_Howe','AUD'),'2026-04-05','01:45',15),false);
});

test('locale controls lock after appointments exist and preserve a valid business choice',()=>{
 const s=business('US','America/Los_Angeles','USD');
 const unlocked=locale.fields(s),locked=locale.fields(s,{locked:true});
 assert.match(unlocked,/value="America\/Los_Angeles" selected/);
 assert.match(unlocked,/value="CA"/);
 assert.match(unlocked,/value="AU"/);
 assert.match(unlocked,/name="currency" required/);
 assert.equal((locked.match(/required disabled/g)||[]).length,3);
 assert.match(locked,/subscriptions are billed in GBP/);
 assert.match(locked,/once appointments exist/);
 const zone={disabled:false,innerHTML:''},currency={disabled:false,value:''};
 assert.equal(locale.countryChanged({name:'country',value:'US',form:{elements:{namedItem:name=>name==='timezone'?zone:currency}}}),true);
 assert.match(zone.innerHTML,/America\/New_York" selected/);
 assert.equal(currency.value,'USD');
});

test('browser and server timezone database disagreements block availability rather than shift a booking',()=>{
 const serverNow='2026-01-01T12:00:00Z',saved={today:'2026-01-01',max_date:'2026-03-17',days:75,timezone:'America/New_York',server_now:serverNow,utc_offset_minutes:-300,receivedTick:0};
 assert.equal(schedule.onlineBookingWindow({bookingWindow:saved},{now:0,tick:0}).valid,true);
 const wrong=schedule.onlineBookingWindow({bookingWindow:{...saved,utc_offset_minutes:-240}},{now:0,tick:0});
 assert.equal(wrong.valid,false);assert.equal(wrong.clockMismatch,true);
});

test('setup, owner save, calendar, customer prices and reminder displays use the shared locale',async()=>{
 const source=await readFile(new URL('../app.js',import.meta.url),'utf8'),account=await readFile(new URL('../accounts.js',import.meta.url),'utf8'),portal=await readFile(new URL('../customer-portal.js',import.meta.url),'utf8'),html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(source,/p_settings:\{\.\.\.JovaBusinessLocale.resolve\(x\)/);
 assert.match(account,/p_settings: \{ \.\.\.window.JovaBusinessLocale.resolve\(salon\)/);
 assert.match(source,/JovaBusinessLocale.fields\(s,\{locked:s.bookings.length>0\}\)/);
 assert.match(source,/JovaBusinessLocale.uniqueSlot\(s,date,clock\(t\)/);
 assert.match(source,/JovaSubscriptions.create\(\{\.\.\.hostApi,money:subscriptionMoney\}\)/);
 assert.match(portal,/JovaBusinessLocale.money\(value,view.business\)/);
 assert.match(portal,/timeZone:'UTC'/);
 assert.ok(html.indexOf('/business-locale.js')<html.indexOf('/accounts.js'));
 assert.ok(html.indexOf('/sms-phone.js')<html.indexOf('/sms-reminders.js'));
});
