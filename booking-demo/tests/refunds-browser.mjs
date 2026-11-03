/** Actual refund panel rendering, polling and recovery with fictional data only. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
source=source.slice(0,source.indexOf('try{await mkdir(out,')).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const width of [1440,390,320]){
  const {context,page}=await make(width);
  try{
   await context.route('**/refund-panel-fixture',route=>route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/dashboard.css"><main class="container" id="fixture"></main><script src="/refunds.js"></script><script>let current="requested",failed=false,calls=0;const esc=s=>String(s).replaceAll("<","&lt;");const api={isLive:()=>true,isDashboardVisible:()=>true,ownerIdentity:()=>"fixture-owner",salon:()=>({id:"fixture-salon"}),esc,money:n=>"£"+n.toFixed(2),humanDate:v=>v,refundActivity:async()=>{calls++;return failed?null:{ok:true,refunds:[{customer:"Alex Customer",service:"Consultation",date:"2026-11-05",time:"11:30",amount_minor:31,status:current}]};},render:()=>document.getElementById("fixture").innerHTML=panel.panel()};const panel=JovaRefunds.create(api);api.render();</script>'}));
   await page.clock.install();await page.goto(base+'/refund-panel-fixture');
   await expect(page.getByRole('heading',{name:'Recent refunds'})).toBeVisible();await expect(page.locator('.db-refund-row')).toContainText('Refund requested');await expect(page.locator('.db-refund-row')).toContainText('£0.31');
   await page.evaluate(()=>{current='succeeded';});await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.db-refund-row')).toContainText('Refunded');
   await page.evaluate(()=>{failed=true;});await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('alert')).toContainText('unavailable');await expect(page.locator('.db-refund-row')).toContainText('Refunded');
   await page.evaluate(()=>{failed=false;current='pending';});await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.db-refund-row')).toContainText('Processing');await expect(page.getByRole('alert')).toHaveCount(0);
   await page.evaluate(()=>{current='succeeded';});await page.clock.fastForward(31000);await expect(page.locator('.db-refund-row')).toContainText('Refunded');await fit(page);
   await page.screenshot({path:path.join(root,'../output/salon-refunds-'+width+'.png'),fullPage:true});console.log('PASS refund status, refresh, error recovery, polling and layout '+width);
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
