/** Payment return and booking confirmation stay in the customer area. No live traffic. */
import {readFile} from 'node:fs/promises';
const fixtureURL=new URL('./public-experience-browser.mjs',import.meta.url);
let source=(await readFile(fixtureURL,'utf8')).replaceAll('\r\n','\n');
source=source.slice(0,source.indexOf('try{await mkdir(out,')).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
const checks=String.raw`
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const width of [1440,390])for(const signedIn of [false,true]){
  const {context,page}=await make(width,{saved:signedIn?session():undefined});
  try{
   await context.addInitScript(slug=>sessionStorage.setItem('jovabook-deposit-'+slug,JSON.stringify({id:'30000000-0000-4000-8000-000000000001',verifier:'a'.repeat(64)})),slug);
   const booking={id:'bk_'+'b'.repeat(32),serviceName:'Consultation',price:25,deposit:5,date:today,time:'11:30',duration:30,staffId:'staff',status:'confirmed'};
   await context.route('**/api/jovabook/deposits/status',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,stage:'paid',booking})}));
   await page.goto(base+'/'+slug+'/book#book/deposit');
   if(process.env.REPRODUCE_CONFIRMATION_HEADER){await expect(page.getByRole('heading',{name:'Your booking is confirmed',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Start free trial',exact:true})).toBeVisible();console.log('REPRODUCED business trial link on paid customer confirmation');break;}
   await expect(page.getByRole('heading',{name:'You’re booked in.',exact:true})).toBeVisible();
   await expect(page.locator('.book-header')).toContainText('Choice Studio');
   await expect(page.locator('.cp-public-link')).toHaveText(signedIn?'My portal':'Log in');
   await expect(page.locator('.cp-public-link')).toHaveAttribute('href',base+'/'+slug+'/account'+(signedIn?'':'/login'));
   await expect(page.locator('a[href="#signup"],a[href="#login"],.topbar')).toHaveCount(0);
   await fit(page);await page.screenshot({path:path.join(root,'../output/customer-confirmation-'+width+'-'+(signedIn?'signed-in':'guest')+'.png'),fullPage:true});
   await page.getByRole('link',{name:'Make another booking',exact:true}).click();await expect(page.locator('[data-action=select-service]')).toBeVisible();
   await expect(page.locator('.cp-public-link')).toHaveText(signedIn?'My portal':'Log in');
   console.log('PASS paid return and next booking '+width+' '+(signedIn?'signed in':'guest'));
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
`;
await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+checks).toString('base64'));
