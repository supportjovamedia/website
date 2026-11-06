import test from 'node:test';
import assert from 'node:assert/strict';
import {currencyForCountry,localPrice,currencyLabel} from '../lib/jovabook-currency.mjs';
import {regionDecision,regionEndpoint} from '../lib/jovabook-region.mjs';
test('countries map to display currencies and everyone else stays on GBP',()=>{
 assert.equal(currencyForCountry('US'),'USD');assert.equal(currencyForCountry('ca'),'CAD');assert.equal(currencyForCountry('AU'),'AUD');
 for(const c of ['GB','IM','JE','GG','',undefined,'FR'])assert.equal(currencyForCountry(c),'GBP');
});
test('plan prices convert for display and keep GBP exact',()=>{
 assert.equal(localPrice(20,'GBP'),'£20');assert.equal(localPrice(57.6,'GBP'),'£57.60');
 assert.equal(localPrice(20,'USD'),'$25');assert.equal(localPrice(20,'CAD'),'C$35');assert.equal(localPrice(20,'AUD'),'A$39');
 assert.equal(localPrice(20,'XXX'),'£20');assert.equal(currencyLabel('CAD'),'CAD');
});
test('region endpoint reports the visitor currency',async()=>{
 const e=regionEndpoint();
 for(const [c,cur] of [['US','USD'],['CA','CAD'],['AU','AUD'],['GB','GBP']]){
  const r=await e.GET(new Request('https://www.jovamedia.com/api/jovabook/region',{headers:{'x-vercel-ip-country':c}}));
  const b=await r.json();assert.equal(b.allowed,true);assert.equal(b.currency,cur);
 }
 assert.equal(regionDecision(new Headers({'x-vercel-ip-country':'IN'})).allowed,false);
});
