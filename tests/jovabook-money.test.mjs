import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceCurrency,validDepositAmount,isServiceCurrency} from '../lib/jovabook-money.mjs';
import {bookingEmailContent} from '../lib/jovabook-email.mjs';

test('service currencies keep exact minor units and bounded currency-specific deposit floors',()=>{
 for(const [currency,min] of [['gbp',30],['usd',50]]){
  assert.equal(serviceCurrency(currency.toUpperCase()),currency);
  assert.equal(validDepositAmount(min,currency),true);
  for(const amount of [min-1,0,-1,50.5,1000001,NaN])assert.equal(validDepositAmount(amount,currency),false);
 }
 assert.equal(serviceCurrency(),'gbp');
 for(const currency of ['eur','jpy','cad','aud','GBP','',null])assert.equal(isServiceCurrency(currency),false);
 for(const currency of ['EUR',null,{},' USD '])assert.throws(()=>serviceCurrency(currency));
});

test('emails label business-local wall time and unambiguous service currency without converting the appointment date',()=>{
 const config={public_url:'https://book.jovamedia.com',sender:'bookings@example.test'};
 for(const [timezone,currency] of [['America/Los_Angeles','USD'],['America/New_York','USD'],['Europe/London','GBP']]){
  const job={recipient:'customer@example.test',payload:{business:'Fixture Studio',slug:'fixture',kind:'confirmed',timezone,currency,booking:{id:'fixture',date:'2026-11-06',time:'23:30',price:25}}};
  const mail=bookingEmailContent(job,config);
  assert.ok(mail.text.includes(`23:30 (${timezone})`));
  assert.match(mail.text,/Friday, 6 November 2026/);
  assert.ok(mail.text.includes(currency==='GBP'?'£25.00':currency));
  assert.doesNotMatch(mail.text,/UK time/);
 }
});

test('invalid email locale fails before any provider call instead of silently relabelling prices or time zones',()=>{
 const job={recipient:'customer@example.test',payload:{timezone:'Invalid/Zone',currency:'USD',booking:{date:'2026-11-06',time:'10:00',price:25}}};
 const cfg={public_url:'https://book.jovamedia.com',sender:'bookings@example.test'};
 assert.throws(()=>bookingEmailContent(job,cfg));
 job.payload.timezone='America/New_York';job.payload.currency='EUR';
 assert.throws(()=>bookingEmailContent(job,cfg));
});
