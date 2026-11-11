import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {businessHostRewrites,originBusiness,businessOrigin,customerOriginAllowed} from '../lib/jovabook-public-address.mjs';
const require=createRequire(import.meta.url),{pathToRegexp}=require('next/dist/compiled/path-to-regexp');
const {matchHas,prepareDestination}=require('next/dist/shared/lib/router/utils/prepare-destination');
const linksSource=await readFile(new URL('../booking-demo/public-links.js',import.meta.url),'utf8');
function runtime(address){const url=new URL(address),redirects=[],window={location:{origin:url.origin,hostname:url.hostname,pathname:url.pathname,search:url.search,hash:url.hash,href:url.href,replace:v=>redirects.push(v)},addEventListener(){}};vm.runInNewContext(linksSource,{window,URL,URLSearchParams});return {window,redirects};}
test('business hosts are strict and reserved company/account hosts stay separate',()=>{
 assert.equal(originBusiness('https://arooj.jovamedia.com'),'arooj');assert.equal(businessOrigin('arooj'),'https://arooj.jovamedia.com');
 for(const value of ['http://arooj.jovamedia.com','https://arooj.jovamedia.com:444','https://arooj.jovamedia.com.attacker.test','https://attacker.test','https://book.jovamedia.com','https://www.jovamedia.com','https://arooj.book.jovamedia.com'])assert.equal(originBusiness(value),null,value);
 assert.equal(customerOriginAllowed('https://arooj.jovamedia.com'),true);assert.equal(customerOriginAllowed('https://arooj.jovamedia.com.attacker.test'),false);
});
test('Next rewrites preserve the public hostname and serve the exact business and static assets',()=>{
 const rules=businessHostRewrites();
 for(const [path,expected] of [['/','https://book.jovamedia.com/arooj'],['/book','https://book.jovamedia.com/arooj/book'],['/account/login','https://book.jovamedia.com/arooj/account/login'],['/app.js','https://book.jovamedia.com/app.js'],['/fonts/font.woff2','https://book.jovamedia.com/fonts/font.woff2'],['/api/jovabook/customer/recovery','https://www.jovamedia.com/api/jovabook/customer/recovery']]){
  let destination;for(const rule of rules){const keys=[],match=pathToRegexp(rule.source,keys).exec(path),host=matchHas({headers:{host:'arooj.jovamedia.com'}},{},rule.has);if(!match||!host)continue;const params={...host};keys.forEach((k,i)=>{if(match[i+1]!==undefined)params[k.name]=match[i+1].split('/').filter(Boolean).length>1?match[i+1].split('/'):match[i+1];});const prepared=prepareDestination({destination:rule.destination,params,query:{},appendParamsToQuery:false});destination=prepared.parsedDestination.origin+prepared.newUrl;break;}assert.equal(destination,expected,path);
 }
 for(const host of ['www.jovamedia.com','book.jovamedia.com','support.jovamedia.com','arooj.jovamedia.com.attacker.test'])assert.equal(matchHas({headers:{host}},{},rules[0].has),false,host);
});
test('public addresses cannot switch business through a query and canonical links use the main domain',async()=>{
 for(const [path,route] of [['/','website'],['/book','book/service'],['/book/time','book/time'],['/account/login','customer/login'],['/login','customer/login'],['/account/register','customer/register']]){const {window}=runtime('https://arooj.jovamedia.com'+path);assert.deepEqual(JSON.parse(JSON.stringify(window.JovaPublicLinks.resolve(window.location))),{slug:'arooj',demo:false,route});}
 const {window}=runtime('https://arooj.jovamedia.com/?salon=another-studio');assert.equal(window.JovaPublicLinks.resolve(window.location).slug,'');assert.equal(window.JovaPublicLinks.booking('arooj'),'https://www.jovamedia.com/book/arooj?view=booking');
 const legacy=runtime('https://book.jovamedia.com/arooj/account/login');vm.runInNewContext(await readFile(new URL('../booking-demo/public-entry.js',import.meta.url),'utf8'),{window:legacy.window,URL,URLSearchParams});assert.deepEqual(legacy.redirects,['https://www.jovamedia.com/book/arooj?view=account#customer/login']);
});

test('old website addresses forward to the main site while old booking links keep their flow', async () => {
 const entry = await readFile(new URL('../booking-demo/public-entry.js', import.meta.url), 'utf8');
 for (const [address, expected] of [
  ['https://book.jovamedia.com/arooj', ['https://www.jovamedia.com/book/arooj']],
  ['https://arooj.jovamedia.com/about', ['https://www.jovamedia.com/book/arooj#about']],
  ['https://arooj.jovamedia.com/#website/contact', ['https://www.jovamedia.com/book/arooj#contact']],
  ['https://book.jovamedia.com/pricing', ['https://www.jovamedia.com/book/pricing']],
  ['https://book.jovamedia.com/arooj#book/service', ['https://www.jovamedia.com/book/arooj?view=booking']],
  ['https://arooj.jovamedia.com/book', ['https://www.jovamedia.com/book/arooj?view=booking']],
  ['https://arooj.jovamedia.com/book?service=trim&utm_source=fb', ['https://www.jovamedia.com/book/arooj?view=booking&service=trim&utm_source=fb']],
  ['https://book.jovamedia.com/?salon=arooj#manage/reference', ['https://www.jovamedia.com/book/arooj?view=booking#manage/reference']],
  ['https://arooj.jovamedia.com/account/login#access_token=fixture&type=recovery', ['https://www.jovamedia.com/book/arooj?view=account#access_token=fixture&type=recovery']],
  ['https://arooj.jovamedia.com/book#book/deposit', []],
  ['https://book.jovamedia.com/?portal=owner#login', []],
  ['https://arooj.jovamedia.com/?salon=other', []],
 ]) {
  const { window, redirects } = runtime(address);
  vm.runInNewContext(entry, { window, URL, URLSearchParams });
  assert.deepEqual(redirects, expected, address);
 }
});
