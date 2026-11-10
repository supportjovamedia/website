import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatorDefaults,calculatorPresets,acuityPricing,acuityGbpMonthly,comparisonAssumptions,calculateComparison,calculatorMoney,subscriptionForPeople,withInitialCalculatorMarkup} from '../app/jovabook/story/calculator.mjs';
import {sections} from '../app/jovabook/story/sections.mjs';

test('initial Fresha example is five illustrative clients with the same server and client arithmetic',()=>{
 const result=calculateComparison(calculatorDefaults);
 assert.deepEqual(result,{subscription:14.95,fee:50,total:64.95,jova:20,saving:44.95});
 assert.equal(calculatorMoney(result.saving*12),'£539.40');
 const html=withInitialCalculatorMarkup(sections.find(section=>section.includes('id="ex-compare"')));
 for(const [id,text] of [['sw-new-clients-value','5'],['ex-breakdown-sub','£14.95'],['ex-breakdown-fees','£50'],['ex-current-name','Fresha'],['ex-current-total','£64.95'],['ex-saving','£539.40'],['ex-saving-unit','saved per year'],['ex-saving-annual','£44.95'],['ex-saving-annual-text','saved per month']]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*>'+text+'<'));
 }
 assert.doesNotMatch(html,/<div id="ex-marketplace-fields" hidden/);
 assert.match(html,/<label[^>]*id="ex-boost-field"[^>]* hidden>/);
 assert.equal(withInitialCalculatorMarkup(html),html);
 assert.equal(withInitialCalculatorMarkup('<section>Other content</section>'),'<section>Other content</section>');
});

test('fees apply only to eligible acquisition and optional extras',()=>{
 const calculate=changes=>calculateComparison({...calculatorDefaults,...changes});
 assert.equal(calculate({newClients:0}).fee,0);
 assert.equal(calculate({newClients:3,firstValue:10}).fee,12);
 assert.equal(calculate({competitor:'treatwell',base:9.99,newClients:5}).fee,87.5);
 assert.equal(calculate({competitor:'booksy',base:40,newClients:30}).fee,0);
 assert.equal(calculate({competitor:'booksy',base:40,newClients:2,firstValue:10,boost:true}).fee,10);
 assert.equal(calculate({people:3,base:29.85,jovaBase:25,jovaPeople:3,insights:true,website:12.95}).subscription,53.7);
 assert.equal(calculate({people:3,base:29.85,jovaBase:25,jovaPeople:3}).jova,37);
 const acuity=calculate({competitor:'acuity',base:23.75,website:12,newClients:30});
 assert.equal(acuity.fee,0);assert.equal(acuity.total,35.75);assert.equal(acuity.saving,15.75);
 assert.equal(calculate({competitor:'squarespace',base:16,jovaBase:0}).saving,16);
});

test('team subscription presets and invalid inputs remain bounded',()=>{
 assert.equal(subscriptionForPeople('fresha',1),14.95);
 assert.equal(subscriptionForPeople('fresha',3),29.85);
 assert.equal(subscriptionForPeople('treatwell',3),24.99);
 assert.equal(subscriptionForPeople('booksy',3),50);
 for(const changes of [{base:NaN},{base:-1},{base:100001},{newClients:1.5},{newClients:10001},{people:0},{people:2},{people:2,jovaBase:25,jovaPeople:1},{competitor:'unknown'},{firstValue:Infinity},{jovaPeople:101}])assert.equal(calculateComparison({...calculatorDefaults,...changes}),null);
});


test('Acuity uses the verified paid Starter plan and dated ECB estimate without adding an unchosen website',()=>{
 assert.equal(acuityPricing.usdMonthly,20);assert.equal(acuityPricing.checked,'2026-11-10');assert.equal(acuityPricing.fxDate,'2026-11-09');assert.equal(acuityGbpMonthly,14.91);assert.equal(calculatorPresets.acuity.base,14.91);
 const result=calculateComparison({...calculatorDefaults,competitor:'acuity',base:acuityGbpMonthly});assert.equal(result.total,14.91);assert.equal(result.fee,0);assert.equal(result.saving,-5.09);assert.equal(calculatorMoney(result.saving*12),'£61.08');
 assert.match(comparisonAssumptions({...calculatorDefaults,competitor:'acuity'}),/US\$20/);assert.match(comparisonAssumptions({...calculatorDefaults,competitor:'acuity'}),/9 Nov 2026/);assert.match(comparisonAssumptions({...calculatorDefaults,competitor:'acuity'}),/No separate website is assumed/);
});
test('server assumptions sit after the disclosure and use the same clear illustrative wording as the runtime',()=>{
 const html=withInitialCalculatorMarkup(sections.find(section=>section.includes('id="ex-compare"')));assert.match(html,/<details class="calculator-footnotes"><summary>Comparison details<span>Before VAT<\/span><\/summary><div class="calculator-footnote-copy">[\s\S]*?id="vp-example"[\s\S]*?<\/div><\/details>/);assert.equal((html.match(/class="calculator-footnotes"/g)||[]).length,1);assert.match(html,/Figures are based on 5 new marketplace clients per month at £50 average/);assert(!comparisonAssumptions(calculatorDefaults).includes('Example:'));
 assert.match(comparisonAssumptions({...calculatorDefaults,competitor:'acuity',acuityCustom:true,base:23.75}),/entered Acuity monthly bill of £23.75/);assert(!comparisonAssumptions({...calculatorDefaults,competitor:'acuity',base:NaN}).includes('NaN'));
});

test('Acuity source context reflects only the website cost actually entered',()=>{const note=comparisonAssumptions({...calculatorDefaults,competitor:'acuity',website:12});assert.match(note,/website of £12\/month/);assert(!note.includes('No separate website is assumed'));});

test('public calculator offers exactly Fresha, Treatwell, Booksy and Squarespace',()=>{
 const html=sections.find(section=>section.includes('id="ex-compare"'));
 assert.deepEqual([...html.matchAll(/data-competitor="([^"]+)"/g)].map(match=>match[1]),['fresha','treatwell','booksy','squarespace']);
});
