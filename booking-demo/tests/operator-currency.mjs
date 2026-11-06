import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../operator.js',import.meta.url),'utf8');
const formatter=source.match(/^const money=.*$/m)[0];
const review=source.slice(source.indexOf('function commissionReviewsMarkup('),source.indexOf('function login('));
const context={Intl,Number,String,esc:String,joined:String,readable:String};
vm.runInNewContext(formatter+'\nglobalThis.money=money;\n'+review,context);
const record=(currency)=>({business:'Fictional Studio',booking_id:'booking_1',original_price_minor:2500,currency,evidence:[],salon_id:'salon_1'});

test('SaaS and legacy commission amounts retain GBP minor-unit interpretation',()=>{
 assert.equal(context.money(2500),'£25.00');
 assert.equal(context.money(null),'Not recorded');
 assert.equal(context.money(25.5),'Not recorded');
 assert.match(source,/<h2>Commission and billing \(GBP\)<\/h2>/);
});

test('original booking prices display their explicit currencies without a mixed total',()=>{
 const html=context.commissionReviewsMarkup({ok:true,total:4,reviews:[record('USD'),record('GBP'),record('CAD'),record('AUD')]});
 assert.match(html,/USD\s*25\.00/);
 assert.match(html,/£25\.00/);
 assert.match(html,/CAD\s*25\.00/);
 assert.match(html,/AUD\s*25\.00/);
 assert.doesNotMatch(html,/£50|USD\s*50/);
});

test('missing or unsupported booking currency withholds the amount instead of assuming GBP',()=>{
 for(const currency of [undefined,null,'','EUR','not-a-currency']){
  const html=context.commissionReviewsMarkup({ok:true,total:1,reviews:[record(currency)]});
  assert.match(html,/Currency not recorded/);
  assert.doesNotMatch(html,/£25|25\.00/);
 }
});
