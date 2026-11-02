import {test,expect} from '@playwright/test';
import {CONSENT_KEY} from '../../lib/marketing-analytics.mjs';

for(const width of [320,360,390,768,1440])test(`JovaBook responsive plans and click-through demo at ${width}px`,async({page,context,baseURL},testInfo)=>{
 await page.setViewportSize({width,height:900});
 const origin=new URL(baseURL).origin,writes=[],errors=[];
 await context.route('**/*',route=>{const request=route.request();if(request.method()!=='GET'&&!new URL(request.url()).pathname.startsWith('/__nextjs'))writes.push(request.url());return new URL(request.url()).origin===origin&&request.method()==='GET'?route.continue():route.abort();});
 await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({choice:'rejected',time:Date.now()})),CONSENT_KEY);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/jovabook');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-jovabook-story]')).toHaveAttribute('data-motion',/active|reduced|static/);
 if(width<=800){const misaligned=await page.locator('main h1,main h2,main h3,main p').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length&&getComputedStyle(el).textAlign!=='center').map(el=>el.textContent.trim()));expect(misaligned).toEqual([]);}
 const walkthrough=page.locator('#customer-booking');
 await expect(walkthrough.getByText('Click-through demo',{exact:true})).toBeVisible();
 await expect(walkthrough).toContainText('It does not connect to a database, create a booking or send any messages.');
 await expect(walkthrough.getByRole('region',{name:'Walkthrough booking summary',exact:true})).toHaveCount(0);
 await expect(walkthrough.getByText('Total',{exact:true})).toHaveCount(0);
 await walkthrough.getByRole('button',{name:/Gel manicure/}).click();
 const next=walkthrough.getByRole('button',{name:'Choose date & time',exact:true}),back=walkthrough.getByRole('button',{name:'Back',exact:true});
 await expect(back).toBeDisabled();
 const positions=await Promise.all([back.boundingBox(),next.boundingBox()]);expect(positions[0].x).toBeLessThan(positions[1].x);expect(Math.abs(positions[0].y-positions[1].y)).toBeLessThan(10);
 await walkthrough.screenshot({animations:'disabled',style:'.header,.skip-link{visibility:hidden!important}',path:testInfo.outputPath(`demo-service-${width}.png`)});
 await next.click();const detailsNext=walkthrough.getByRole('button',{name:'Continue to details',exact:true});await expect(detailsNext).toBeDisabled();
 await walkthrough.getByRole('button',{name:'Tue 10',exact:true}).click();await walkthrough.getByRole('button',{name:'10:30',exact:true}).click();await expect(detailsNext).toBeEnabled();
 await detailsNext.click();await expect(walkthrough.getByRole('textbox')).toHaveCount(0);await expect(walkthrough.getByText('Total',{exact:true})).toHaveCount(0);
 await back.click();await expect(walkthrough.getByRole('button',{name:'10:30',exact:true})).toHaveAttribute('aria-pressed','true');
 await walkthrough.getByRole('button',{name:'Wed 11',exact:true}).click();await expect(walkthrough.getByRole('button',{name:'Continue to details',exact:true})).toBeDisabled();
 await walkthrough.getByRole('button',{name:'14:30',exact:true}).click();await walkthrough.getByRole('button',{name:'Continue to details',exact:true}).click();await walkthrough.getByRole('button',{name:'Review booking',exact:true}).click();
 const review=walkthrough.getByRole('region',{name:'Walkthrough booking summary',exact:true});await expect(review).toContainText('Gel manicure');await expect(review).toContainText('Wednesday 11 November at 14:30');await expect(review).toContainText('£35.00');await expect(review.getByText('Total',{exact:true})).toBeVisible();await expect(walkthrough.getByRole('button',{name:/confirm|pay now/i})).toHaveCount(0);
 await walkthrough.screenshot({animations:'disabled',style:'.header,.skip-link{visibility:hidden!important}',path:testInfo.outputPath(`demo-review-${width}.png`)});
 await walkthrough.getByRole('button',{name:'Start again',exact:true}).click();await expect(walkthrough.getByText('Total',{exact:true})).toHaveCount(0);
 const plans=page.getByRole('region',{name:'JovaBook plans',exact:true});
 if(width<=800){await expect(plans.getByRole('table')).toHaveCount(0);await expect(plans.getByRole('article')).toHaveCount(3);const geometry=[];for(const name of ['Essential','Standard','Premium']){const plan=plans.getByRole('article',{name:`${name} plan`,exact:true});await expect(plan.getByRole('heading',{name,exact:true})).toBeVisible();await expect(plan.getByText('Your business website',{exact:true})).toBeVisible();geometry.push(await plan.boundingBox());}expect(geometry[1].y).toBeGreaterThan(geometry[0].y+geometry[0].height);expect(geometry[2].y).toBeGreaterThan(geometry[1].y+geometry[1].height);for(const box of geometry){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);}}
 else{await expect(plans.getByRole('table')).toHaveCount(1);await expect(plans.getByRole('article')).toHaveCount(0);await expect(plans.getByRole('columnheader')).toHaveCount(4);await expect(plans.getByRole('row')).toHaveCount(12);const heads=await plans.locator('thead th').evaluateAll(elements=>elements.slice(1).map(el=>el.getBoundingClientRect().top));for(const top of heads)expect(Math.abs(top-heads[0])).toBeLessThan(1);}
 await page.getByRole('button',{name:'Yearly Save 20%',exact:true}).click();for(const price of ['£192 billed yearly','£480 billed yearly','£960 billed yearly'])await expect(plans).toContainText(price);const trialLinks=plans.getByRole('link',{name:'Try JovaBook for free',exact:true});await expect(trialLinks).toHaveCount(3);for(const [index,plan] of ['essential','standard','premium'].entries())await expect(trialLinks.nth(index)).toHaveAttribute('href',new RegExp('plan='+plan+'&cadence=annual#signup$'));
 await page.getByRole('button',{name:'Monthly',exact:true}).click();await expect(page.getByRole('button',{name:'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('#plans').screenshot({animations:'disabled',style:'.header,.skip-link{visibility:hidden!important}',path:testInfo.outputPath(`plans-${width}.png`)});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // The same plan component is used on Pricing, with the other categories intact.
 await page.goto('/pricing');const categories=page.getByRole('navigation',{name:'Product categories',exact:true});await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();await categories.getByRole('button',{name:'Websites',exact:true}).click();await expect(page.getByRole('heading',{name:'Landing Page',exact:true})).toBeVisible();await categories.getByRole('button',{name:'Webcare',exact:true}).click();await expect(page.locator('#subscriptions article')).toHaveCount(2);
 expect(writes).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
