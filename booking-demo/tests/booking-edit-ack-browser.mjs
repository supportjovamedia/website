/** Focused local-only browser proof, reusing the owner experience mock harness. */
import {readFile} from 'node:fs/promises';
const harnessURL=new URL('./owner-experience-browser.mjs',import.meta.url);
let harness=(await readFile(harnessURL,'utf8')).replaceAll('\r\n','\n');
const boundary=harness.indexOf('\ntry{\n await mkdir');if(boundary<0)throw Error('Owner harness boundary missing');harness=harness.slice(0,boundary);
if(!harness.includes('function mockedBackend'))throw Error('Owner harness boundary changed');
harness=harness.replaceAll('import.meta.url',JSON.stringify(harnessURL.href)).replaceAll("test-results/owner-experience","test-results/booking-edit-ack");
const focused=String.raw`
try{
 await mkdir(output,{recursive:true});await start();const {chromium,expect}=playwright();
 browser=await chromium.launch({headless:true,channel:'chrome'});
 context=await newContext();page=await attach(context);await login();await page.waitForURL(/#dashboard$/);baseline=await storage();
 currentTest='phone validation and review policy';
 await go('customers');await page.locator('[data-action="add-customer"]').click();let client=page.locator('[data-form="customer"]');await client.locator('[name="name"]').fill('Phone Smoke');await client.locator('[name="email"]').fill('phone-smoke@example.test');await client.locator('[name="phone"]').fill('abc');await client.locator('button.primary').click();await expect(client.locator('.error')).toContainText('7 to 15 digits');await client.locator('[name="phone"]').fill('+44 (0)7700 900123');await client.locator('button.primary').click();await expect(client).toHaveCount(0);
 await serviceTime(future(1));await page.locator('[data-action=select-time]').first().click();await go('book/details');const guest=page.locator('[data-form="customer-details"]');await guest.locator('[name="name"]').fill('Guest Phone');await guest.locator('[name="email"]').fill('guest-phone@example.test');await guest.locator('[name="phone"]').fill('abc');await guest.locator('[type=checkbox]').check();await guest.locator('button.primary').click();await expect(guest.locator('.error')).toContainText('7 to 15 digits');
 await go('book/payment');await expect(page.locator('[data-cancellation-policy]')).toContainText('24 hours');assert(await page.locator('[data-cancellation-policy]').evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('[data-action="confirm-booking"]'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 report.tests.push({name:currentTest,status:'passed'});
 for(const reject of [true,false]){
  currentTest=reject?'conflict keeps original booking':'success waits for acknowledgement';
  const mock=mockedBackend(selected(baseline)),sid=mock.row.id,staff=mock.tables.staff[0].id,service=mock.tables.services[0].id,date=future(1);
  mock.row.owner_id=sid;mock.row.subscription_status='active';mock.tables.customers.push({id:'qa-client',salon_id:sid,name:'QA Ack Client',email:'ack@example.test',phone:''});
  mock.tables.bookings.push({id:'qa-ack',salon_id:sid,service_id:service,service_name:'QA Treatment',price:40,duration:30,date,time:'10:00',staff_id:staff,customer_id:'qa-client',name:'QA Ack Client',email:'ack@example.test',phone:'',notes:'',source:'Online',status:'confirmed',deposit:0});
  let release,entered=false,writes=0;const pending=new Promise(resolve=>release=resolve);
  const ctx=await newContext(async(req,url)=>{if(url.pathname==='/rest/v1/bookings'&&req.method()==='POST'){entered=true;writes++;await pending;if(reject)return {status:409,body:{code:'23P01',message:'That time is already booked. Choose another time.'}};}return mock.handler(req,url);});
  await ctx.route('**/api/jovabook/billing/status',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,access:'active',reason:'paid',business:{id:sid,name:mock.row.name,slug:mock.row.slug,plan:'standard',status:'active'},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:true,canCheckout:false},staff_limit:5})}));page=await attach(ctx);await login('qa-owner@example.test','QAOnly2026');await page.waitForURL(/#dashboard$/);await go('appointments');
  const row=page.locator('tr').filter({hasText:'QA Ack Client'});await expect(row).toContainText('10:00');
  await page.locator('[data-action="edit-booking"][data-id="qa-ack"]').click();const form=page.locator('[data-form="edit-booking"]');await form.locator('[name="time"]').selectOption('11:00');await form.locator('button.primary').click();
  await expect.poll(()=>entered).toBe(true);await expect(form).toHaveAttribute('data-saving','true');await expect(form).toHaveAttribute('aria-busy','true');await expect(form.locator('button.primary')).toHaveText('Saving…');await expect(form.locator('button.primary')).toBeDisabled();await expect(row).toContainText('10:00');await expect(row).not.toContainText('11:00');assert.equal(mock.tables.bookings[0].time,'10:00');await expect(page.locator('#toast')).not.toHaveText('Booking updated.');
  // A second submit while awaiting the server cannot create a duplicate write.
  await form.evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(writes,1);
  release();
  if(reject){await expect(form.locator('.error')).toContainText('already booked');await expect(form.locator('button.primary')).toBeEnabled();await expect(row).toContainText('10:00');await expect(row).not.toContainText('11:00');assert.equal(mock.tables.bookings[0].time,'10:00');await expect(page.locator('#toast')).not.toHaveText('Booking updated.');}
  else{await expect(form).toHaveCount(0);await expect(row).toContainText('11:00');await expect(page.locator('#toast')).toHaveText('Booking updated.');assert.equal(mock.tables.bookings[0].time,'11:00');assert.equal(writes,1);}
  report.tests.push({name:currentTest,status:'passed',writes,original:'10:00',requested:'11:00'});await shot(reject?'conflict-preserves-calendar':'success-after-ack');await ctx.close();
 }
 assert.equal(report.pageErrors.length,0);console.log(JSON.stringify(report.tests));
}catch(error){report.failure=String(error.stack||error).replace(/data:text\/javascript;base64,[^ :]+/g,'focused-browser');console.error(report.failure);process.exitCode=1;}
finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser?.close();server?.kill();}
`;
await import('data:text/javascript;base64,'+Buffer.from(harness+'\n'+focused).toString('base64'));
