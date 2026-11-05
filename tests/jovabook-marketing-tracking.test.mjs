import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPage,replaySafeUrl,eventPayload,jovabookClickEvent} from '../lib/marketing-analytics.mjs';
import {jovabookMarketingPlans,jovabookSignupHref} from '../lib/jovabook-marketing-plans.mjs';
test('public landing page is measurable but customer journeys and private URLs stay excluded',()=>{
 assert.equal(publicPage('/jovabook'),true);
 for(const path of ['/account/login','/operator.html','/jovabook/private'])assert.equal(publicPage(path),false);
 assert.equal(replaySafeUrl('https://www.jovamedia.com/jovabook?utm_source=nextdoor#plans'),true);
 assert.equal(replaySafeUrl('https://www.jovamedia.com/jovabook?email=private@example.com'),false);
 const p=eventPayload('page_view',{},'https://www.jovamedia.com/jovabook?utm_source=whatsapp&email=private@example.com');
 assert.equal(p.page_path,'/jovabook');assert.doesNotMatch(p.page_location,/private|email/);
});
test('trial interest, plan handoff and login remain separate, bounded signals',()=>{
 const page='https://www.jovamedia.com/jovabook';
 assert.equal(jovabookClickEvent('#plans',page).name,'jovabook_pricing_interest');
 assert.equal(jovabookClickEvent('https://book.jovamedia.com/login',page).name,'jovabook_login_click');
 for(const plan of jovabookMarketingPlans)for(const cadence of ['monthly','annual']){
  const href=jovabookSignupHref(plan.id,cadence),event=jovabookClickEvent(href,page);
  assert.equal(event.name,'jovabook_plan_selected');assert.deepEqual(event.fields,{plan:plan.id,cadence:plan.id==='essential'?'monthly':cadence});
  assert.equal(eventPayload(event.name,event.fields,page).plan,plan.id);
 }
 assert.equal(jovabookClickEvent('https://evil.example/login',page),null);
 assert.equal(eventPayload('jovabook_plan_selected',{plan:'private@example.com',cadence:'monthly'},page),null);
 assert.deepEqual(jovabookMarketingPlans.map(p=>[p.monthly,p.annual,p.commission]),[[0,0,0],[20,192,0],[25,240,0]]);
});
