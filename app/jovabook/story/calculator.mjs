// Illustrative UK inputs, before VAT. Users can replace them with their invoice.
// Checked 10 Nov 2026: Acuity Starter is US$20/month, excluding tax.
// GBP is a dated reference estimate, not a quote or card conversion rate.
export const acuityPricing=Object.freeze({plan:'Starter',usdMonthly:20,checked:'2026-11-10',fxDate:'2026-11-09',usdPerEuro:1.1193,gbpPerEuro:.8343,source:'https://www.acuityscheduling.com/pricing/',fxSource:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'});
export const acuityGbpMonthly=Math.round(acuityPricing.usdMonthly*acuityPricing.gbpPerEuro/acuityPricing.usdPerEuro*100)/100;
export const calculatorDefaults=Object.freeze({competitor:'fresha',base:14.95,people:1,website:0,newClients:5,firstValue:50,manualFees:0,jovaBase:20,jovaPeople:1,boost:false,insights:false});
export const calculatorPresets=Object.freeze({
 booksy:{base:40,hint:'UK base plan, before VAT',note:'Booksy’s ordinary marketplace bookings have no commission. Boost is optional: 30% of an eligible new client’s first visit, minimum £5.'},
 fresha:{base:14.95,hint:'Independent plan; teams use £9.95 per person',note:'Fresha: illustrative 20% once on eligible new marketplace clients, minimum £4. This estimate excludes unpublished high-value fee caps; check your invoice. Returning clients and clients who find you directly have no marketplace fee.'},
 treatwell:{base:9.99,hint:'Connect Freelancer; Advanced is £24.99 for teams',note:'Treatwell: 35% on a qualifying new marketplace client’s first booking. Repeat and direct bookings are 0%. A client can count as new again after 365 days without a successful Treatwell visit.'},
 acuity:{base:acuityGbpMonthly,hint:'Starter: US$20/month, about £14.91 before tax',note:'Acuity Starter: US$20/month before tax. GBP estimate uses ECB rates from 9 Nov 2026. Your card rate and fees may differ. Replace it with your own bill; a separate paid website is included only if you add its cost.'},
 squarespace:{base:16,hint:'Basic website plan, billed monthly',note:'Website costs only: Squarespace Basic compared with the included JovaBook one-page website. Scheduling, domains and other add-ons are separate. The products have different features.'},
 solo:{base:25,hint:'£30 including VAT, normalised to £25 before VAT',note:'Solo’s website and booking plan has no new-client commission. Introductory discounts and education add-ons are not included.'},
 manual:{base:40,hint:'Enter your actual recurring costs before VAT',note:'Use the charges on your own invoice. Only add website and commission costs you actually pay.'}
});

export function subscriptionForPeople(competitor,people){
 if(!Number.isInteger(people)||people<1||people>100||!Object.hasOwn(calculatorPresets,competitor))return null;
 if(competitor==='fresha')return people===1?calculatorPresets.fresha.base:Math.round(9.95*people*100)/100;
 if(competitor==='treatwell')return people===1?calculatorPresets.treatwell.base:24.99;
 if(competitor==='booksy')return calculatorPresets.booksy.base+Math.max(0,people-1)*5;
 return calculatorPresets[competitor].base;
}

export function calculateComparison(model){
 const {competitor,base,people,website,newClients,firstValue,manualFees,jovaBase,jovaPeople,boost,insights}=model;
 const values=[base,people,website,newClients,firstValue,manualFees,jovaBase,jovaPeople];
 if(!Object.hasOwn(calculatorPresets,competitor)||values.some(value=>!Number.isFinite(value)||value<0)||base>100000||website>100000||firstValue>100000||manualFees>100000||!Number.isInteger(people)||people<1||people>100||!Number.isInteger(newClients)||newClients>10000||![0,20,25].includes(jovaBase)||!Number.isInteger(jovaPeople)||jovaPeople<1||jovaPeople>100||(people>1&&(jovaBase!==25||jovaPeople<people)))return null;
 let subscription=base,fee=0;
 if(competitor==='fresha')fee=newClients*Math.max(4,firstValue*.2);
 if(competitor==='treatwell')fee=newClients*firstValue*.35;
 if(competitor==='booksy'&&boost)fee=newClients*Math.max(5,firstValue*.3);
 if(competitor==='manual')fee=manualFees;
 if(competitor==='fresha'&&insights)subscription+=7.95*people;
 const jova=jovaBase+(jovaBase===25?Math.max(0,jovaPeople-1)*6:0),total=subscription+fee+website;
 return {subscription,fee,total,jova,saving:Math.round((total-jova)*100)/100};
}

const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:2});
const preciseGbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2});
export function calculatorMoney(number){const value=Math.abs(Math.round(number*100)/100);return (Number.isInteger(value)?gbp:preciseGbp).format(value);}

export function comparisonAssumptions({competitor,newClients,firstValue,boost,acuityCustom=false,base=acuityGbpMonthly,website=0}){
 if(competitor==='squarespace')return 'Figures compare website costs only: Squarespace Basic and the included JovaBook one-page website. Scheduling and other add-ons are separate.';
 if(competitor==='acuity'&&(!Number.isFinite(base)||base<0||!Number.isFinite(website)||website<0))return 'Enter a valid monthly Acuity cost in GBP to update this comparison.';
 if(competitor==='acuity'){
  const site=website>0?' A separate website of '+calculatorMoney(website)+'/month is included because you entered it.':' No separate website is assumed.';
  return (acuityCustom?'Figures use your entered Acuity monthly bill of '+calculatorMoney(base)+'.':'Figures use Acuity Starter at US$20/month, estimated as '+calculatorMoney(acuityGbpMonthly)+' at ECB rates from 9 Nov 2026. Card rates and fees may differ.')+site;
 }
 const acquisition=['fresha','treatwell'].includes(competitor)||(competitor==='booksy'&&boost);
 if(acquisition&&(!Number.isFinite(newClients)||!Number.isFinite(firstValue)))return 'Enter valid client numbers and appointment values to update the figures.';
 return acquisition?'Figures are based on '+newClients+' new marketplace clients per month at '+calculatorMoney(firstValue)+' average first-visit value. Adjust these illustrative inputs to match your business.':'Figures use Booksy’s monthly subscription with Boost off, before VAT. Adjust the inputs to match your bill.';
}

export function comparisonCostsMarkup(currentName,currentTotal,jovaName,jovaTotal,breakdown={subscription:'',fee:'',website:''}){
 const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return '<p class="calculator-example-label">Illustrative monthly comparison, before VAT</p><div class="calculator-monthly-costs">'+
  '<div class="js-cost-row calculator-current-cost"><div class="calculator-cost-label"><small>Estimated current monthly cost</small><span id="ex-current-name">'+escape(currentName)+'</span></div><div class="calculator-price-value"><span class="calculator-reject-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></span><b id="ex-current-total">'+escape(currentTotal)+'</b><small>/ month</small></div><dl class="calculator-cost-lines"><div><dt>Subscription</dt><dd data-calculator-current-sub>'+escape(breakdown.subscription)+'</dd></div><div><dt>Eligible acquisition fees</dt><dd data-calculator-current-fees>'+escape(breakdown.fee)+'</dd></div><div><dt>Separate website</dt><dd data-calculator-current-site>'+escape(breakdown.website)+'</dd></div></dl></div>'+
  '<div class="js-cost-row calculator-jova-cost"><div class="calculator-cost-label"><small>With JovaBook</small><div class="calculator-name-line"><span id="ex-jova-name">'+escape(jovaName)+'</span><span class="calculator-included">Website included</span></div></div><div class="calculator-price-value"><b id="ex-jova-total">'+escape(jovaTotal)+'</b><small>/ month</small></div><dl class="calculator-cost-lines"><div><dt>Subscription</dt><dd data-calculator-jova-sub>'+escape(jovaTotal)+'</dd></div><div><dt>Booking commission</dt><dd>£0</dd></div><div><dt>Included website</dt><dd>£0</dd></div></dl></div></div>';
}

// The same model supplies the server HTML and the enhanced calculator. Other
// story sections pass through unchanged, making this usable as sections.map().
export function withInitialCalculatorMarkup(html){
 if(!html.includes('id="ex-compare"'))return html;
 const model=calculatorDefaults,result=calculateComparison(model);
 const fields={
  'ex-sub-hint':'Independent plan, before VAT','sw-new-clients-value':String(model.newClients),
  'ex-breakdown-sub':calculatorMoney(result.subscription),'ex-breakdown-fees':calculatorMoney(result.fee),'ex-breakdown-site':calculatorMoney(model.website),
  'ex-commission-note':calculatorPresets.fresha.note,'ex-saving-heading':'Estimated savings','vp-versus':'with JovaBook Solo vs Fresha',
  'ex-saving':calculatorMoney(result.saving*12),'ex-saving-unit':'saved per year','ex-saving-annual':calculatorMoney(result.saving),'ex-saving-annual-text':'saved per month',
  'ex-current-name':'Fresha','ex-current-total':calculatorMoney(result.total),'ex-jova-name':'JovaBook Solo','ex-jova-total':calculatorMoney(result.jova),
  'vp-example':comparisonAssumptions(model)
 };
 for(const [id,text] of Object.entries(fields)){
  const pattern=new RegExp('(<[a-z][^>]*\\bid="'+id+'"[^>]*>)[^<]*(</[a-z][^>]*>)','i');
  if(!pattern.test(html))throw new Error('Missing initial calculator field '+id);
  html=html.replace(pattern,(_,open,close)=>open+text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+close);
 }
 const inputs={'ex-comp-subscription':model.base,'ex-comp-seats':model.people,'ex-comp-website':model.website,'ex-new-clients':model.newClients,'ex-first-value':model.firstValue,'ex-manual-commissions':model.manualFees,'ex-jova-seats':model.jovaPeople};
 for(const [id,value] of Object.entries(inputs))html=html.replace(new RegExp('(<input\\b(?=[^>]*\\bid="'+id+'")[^>]*\\bvalue=")[^"]*(")'),(_,before,after)=>before+value+after);
 for(const [id,hidden] of [['ex-marketplace-fields',false],['ex-fresha-extras',false],['ex-boost-field',true],['ex-manual-field',true],['ex-jova-seats-field',true],['ex-free-limit',true]]){
  html=html.replace(new RegExp('<[a-z][^>]*\\bid="'+id+'"[^>]*>','i'),tag=>{const clean=tag.replace(/\s+hidden(?:="[^"]*")?/,'');return hidden?clean.slice(0,-1)+' hidden>':clean;});
 }
 if(!html.includes('class="calculator-monthly-costs"')){
  html=html.replace(/<div class="js-cost-row">\s*<span id="ex-(?:current|jova)-name">[^<]*<\/span>\s*<b id="ex-(?:current|jova)-total">[^<]*<\/b>\s*<\/div>/g,'');
  html=html.replace(/(<div class="ex-compare-result[^\"]*"[^>]*>)/,(_,open)=>open+comparisonCostsMarkup('Fresha',calculatorMoney(result.total),'JovaBook Solo',calculatorMoney(result.jova),{subscription:calculatorMoney(result.subscription),fee:calculatorMoney(result.fee),website:calculatorMoney(model.website)}));
 }
 if(!html.includes('class="calculator-savings-card"'))html=html.replace(/(<p\b[^>]*\bid="ex-saving-heading"[^>]*>[\s\S]*?<p class="ex-annual">[\s\S]*?<\/p>)/,(_,content)=>'<div class="calculator-savings-card">'+content+'</div>');
 html=html.replace(/<details class="calculator-footnotes"><summary>Comparison details<span>Before VAT<\/span><\/summary><div class="calculator-footnote-copy">([\s\S]*?)<\/div><\/details>/,'$1');
 const notes=[];
 for(const pattern of [/<p class="calculator-example-label">[^<]*<\/p>/,/<p\b[^>]*\bid="vp-example"[^>]*>[^<]*<\/p>/]){
  const match=html.match(pattern);if(match){notes.push(match[0]);html=html.replace(pattern,'');}
 }
 const footerAt=html.lastIndexOf('</div></section>');if(footerAt<0)throw new Error('Missing calculator footer');
 html=html.slice(0,footerAt)+'<details class="calculator-footnotes"><summary>Comparison details<span>Before VAT</span></summary><div class="calculator-footnote-copy">'+notes.join('')+'</div></details>'+html.slice(footerAt);
 html=html.replace(/(<section\b[^>]*\bid="ex-compare"[^>]*?)(?:\s+data-calculator-outcome="[^"]*")?>/,(_,open)=>open+' data-calculator-outcome="saving">');
 return html;
}
