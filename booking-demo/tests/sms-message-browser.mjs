/* Actual controls against intercepted APIs. No provider access or sends. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./sms-reminders-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');source=source.slice(0,source.indexOf('\ntry{await mkdir(output')).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href)).replaceAll('output/jovabook-sms-reminders','output/jovabook-sms-controls');
source=source.replace("if(p.endsWith('/rpc/set_sms_reminders'))", "if(p.endsWith('/rpc/set_sms_message')){f.info.message_template=args.p_message;return answer(f.info);}if(p.endsWith('/rpc/set_sms_reminders'))");
source=source.replace("if(u.origin===base){", "if(u.origin===base){if(u.pathname==='/api/jovabook/operator/sms')return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,credits:50,sent:0,delivered:0,queued:0,failed:0,unknown:0,businesses:[],checked_at:new Date().toISOString()})});");
const checks=String.raw`
try{await mkdir(output,{recursive:true});await owner();const form=()=>page.locator('[data-form=sr-message]');await expect(form()).toBeVisible();
 const message='Reminder: {time} on {day}, {date}. {business}, {address}.';
 await form().locator('textarea').fill(message);await expect(form().locator('[data-sms-preview]')).not.toContainText('{time}');await expect(form().getByRole('button',{name:'Save message'})).toBeEnabled();await form().getByRole('button',{name:'Save message'}).click();await expect(form()).toHaveAttribute('data-dirty','false');assert.equal(fixtures['owner-b'].info.message_template,message);
 await form().locator('textarea').fill('Missing tokens');await expect(form().getByRole('button',{name:'Save message'})).toBeDisabled();await form().locator('textarea').fill(message);
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot(page,'sms-editor-'+width);}
 await page.evaluate(()=>sessionStorage.setItem('jovabook-operator-auth-v1',JSON.stringify({access_token:'operator-fixture',refresh_token:'refresh',expires_at:Date.now()/1000+3600,user_id:'operator'})));
 await page.goto(base+'/operator.html');await page.getByRole('button',{name:'SMS reminders',exact:true}).click();await expect(page.locator('h1')).toHaveText('SMS reminders');await expect(page.locator('.op-summary')).toContainText('50');await expect(page.locator('.op-sms-activity')).toContainText('No SMS activity yet');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot(page,'sms-backoffice-'+width);}
 report.status='passed';assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);console.log('PASS editor save, validation, preview and back-office balance at desktop, 390 and 320px');
}catch(error){report.status='failed';report.error=String(error.stack||error);console.error(report.error);process.exitCode=1;}
finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));for(const context of contexts)await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
`;
// Operator's initial RPC is deliberately denied in this fixture, then its SMS endpoint is read-only.
source=source.replace("if(p==='/auth/v1/user')", "if(p.endsWith('/rpc/portal_identity'))return answer({ok:true,role:'operator'});if(p.endsWith('/rpc/operator_businesses'))return answer({ok:true,businesses:[]});if(p.endsWith('/rpc/operator_overview'))return answer({ok:true,notifications:[],months:[]});if(p==='/auth/v1/user')");
await import('data:text/javascript;base64,'+Buffer.from(source+checks).toString('base64'));
