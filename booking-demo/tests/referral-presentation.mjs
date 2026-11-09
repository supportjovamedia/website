import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../workspace.js',import.meta.url),'utf8');
const referral=source.slice(source.indexOf('/* Referral progress is delivered'));
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function setup(data){
 const context={window:{},document:{addEventListener(){}}};vm.runInNewContext(referral,context);let renders=0;
 const view=context.window.JovaReferrals.create({accessInfo:()=>data?{referrals:data}:null,esc,render:()=>renders++});
 return {view,terms:context.window.JovaReferrals.terms,get renders(){return renders;}};
}
const fixture=()=>({code:'AB12CD34EF',joined:2,qualified:1,progress:1,earned:0,available:0,can_claim:false,referred_by:true,referrals:[{id:'1',business:'New Studio',status:'qualified',joined_at:'2026-11-01T10:00:00Z'},{id:'2',business:'Nail & Co',status:'joined',joined_at:'2026-11-03T10:00:00Z',period_end:'2026-12-03T10:00:00Z'}]});

test('referral presentation retains actual progress, status filters and native invitation destinations',()=>{
 const x=setup(fixture()),html=x.view.page();
 for(const text of ['jr-refreshed','jrr-banner','Your referral code','AB12CD34EF','2 more','1 of 3 qualifying referrals','New Studio','Paid month in progress','Good to know'])assert(html.includes(text),text);
 assert.match(html,/href="mailto:\?subject=/);assert.match(html,/href="https:\/\/wa.me\/\?text=/);
 assert.equal((html.match(/class="jrr-stat-icon"/g)||[]).length,4);
 x.view.click('referral-filter',{dataset:{filter:'waiting'}});const waiting=x.view.page();assert(!waiting.includes('<strong>New Studio</strong>'));assert(waiting.includes('Nail &amp; Co'));assert.equal(x.renders,1);
});

test('rewards remain server-gated and full qualification terms remain available',()=>{
 const d=fixture(),x=setup(d);assert(!x.view.page().includes('data-action="referral-claim"'));
 d.can_claim=true;d.available=1;assert(x.view.page().includes('data-action="referral-claim"'));
 for(const text of ['first full paid billing period','Extra seats','Annual invoices','Self-referrals'])assert(x.terms.toLowerCase().includes(text.toLowerCase()),text);
});

test('empty, unavailable and hostile referral content render without fabricated records',()=>{
 assert(setup(null).view.page().includes('Referral details are unavailable'));
 const d={...fixture(),referrals:[],joined:0,qualified:0,progress:0};let html=setup(d).view.page();assert(html.includes('Your first referral starts here'));assert(!html.includes('class="jrr-register" open'));
 d.referrals=[{business:'<img src=x>',status:'joined',joined_at:'2026-11-01T10:00:00Z'}];html=setup(d).view.page();assert(html.includes('&lt;img src=x&gt;'));assert(!html.includes('<img'));
});
