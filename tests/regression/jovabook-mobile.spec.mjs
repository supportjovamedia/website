import {test,expect} from '@playwright/test';
import {CONSENT_KEY} from '../../lib/marketing-analytics.mjs';

for(const width of [320,360,390,768,1440])test(`JovaBook responsive plans and click-through demo at ${width}px`,async({page,context,baseURL},testInfo)=>{
 await page.setViewportSize({width,height:900});
 const origin=new URL(baseURL).origin,writes=[],errors=[];
 await context.route('**/*',route=>{const request=route.request();if(request.method()!=='GET'&&!new URL(request.url()).pathname.startsWith('/__nextjs'))writes.push(request.url());return new URL(request.url()).origin===origin&&request.method()==='GET'?route.continue():route.abort();});
 await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({choice:'rejected',time:Date.now()})),CONSENT_KEY);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/jovabook');await page.evaluate(()=>document.fonts.ready);
 const walkthrough=page.locator('#booking-demo');
 await expect(walkthrough.getByText('Interactive preview',{exact:true})).toBeVisible();
 await walkthrough.getByRole('button',{name:/Gel manicure/}).click();
 const next=walkthrough.getByRole('button',{name:'Choose a date',exact:true}),back=walkthrough.getByRole('button',{name:'Back',exact:true});await expect(back).toBeDisabled();
 const positions=await Promise.all([back.boundingBox(),next.boundingBox()]);expect(positions[0].x).toBeLessThan(positions[1].x);expect(Math.abs(positions[0].y-positions[1].y)).toBeLessThan(10);
 await walkthrough.screenshot({animations:'disabled',path:testInfo.outputPath('demo-service-'+width+'.png')});
 await next.click();await walkthrough.getByRole('button',{name:'Wed 11 Nov',exact:true}).click();await walkthrough.getByRole('button',{name:'14:30',exact:true}).click();await back.click();await expect(walkthrough.getByRole('button',{name:/Gel manicure/})).toHaveAttribute('aria-pressed','true');await next.click();await expect(walkthrough.getByRole('button',{name:'14:30',exact:true})).toHaveAttribute('aria-pressed','true');await walkthrough.getByRole('button',{name:'See review',exact:true}).click();
 await expect(walkthrough.getByRole('heading',{name:'Review this appointment',exact:true})).toBeFocused();await expect(walkthrough).toContainText('Gel manicure');await expect(walkthrough).toContainText('Wed 11 Nov');await expect(walkthrough).toContainText('14:30');await expect(walkthrough).toContainText('£35');await expect(walkthrough).toContainText('Preview complete. No appointment has been made.');await expect(walkthrough.getByRole('textbox')).toHaveCount(0);await expect(walkthrough.getByRole('button',{name:/confirm|pay now/i})).toHaveCount(0);
 await walkthrough.screenshot({animations:'disabled',path:testInfo.outputPath('demo-review-'+width+'.png')});await walkthrough.getByRole('button',{name:'Try again',exact:true}).click();await expect(walkthrough.getByRole('heading',{name:'Choose your service'})).toBeVisible();
 const plans=page.locator('#plans');await expect(plans.getByRole('article')).toHaveCount(3);await expect(plans.getByRole('table')).toHaveCount(0);const geometry=[];for(const name of ['Essential','Standard','Premium']){const plan=plans.getByRole('article',{name:name+' plan',exact:true});await expect(plan.getByRole('heading',{name,exact:true})).toBeVisible();geometry.push(await plan.boundingBox());}for(const box of geometry){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);}if(width<=760){expect(geometry[1].y).toBeGreaterThanOrEqual(geometry[0].y+geometry[0].height);expect(geometry[2].y).toBeGreaterThanOrEqual(geometry[1].y+geometry[1].height);}else for(const box of geometry)expect(Math.abs(box.y-geometry[0].y)).toBeLessThan(1);
 await plans.getByRole('button',{name:'Yearly Save 20%',exact:true}).click();for(const price of ['£192 billed yearly','£480 billed yearly','£960 billed yearly'])await expect(plans).toContainText(price);const trialLinks=plans.getByRole('link',{name:'Start free trial',exact:true});await expect(trialLinks).toHaveCount(3);for(const [index,plan] of ['essential','standard','premium'].entries())await expect(trialLinks.nth(index)).toHaveAttribute('href',new RegExp('plan='+plan+'&cadence=annual#signup$'));
 await plans.getByRole('button',{name:'Monthly',exact:true}).click();await expect(plans.getByRole('button',{name:'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');await plans.screenshot({animations:'disabled',path:testInfo.outputPath('plans-'+width+'.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // The same plan component is used on Pricing, with the other categories intact.
 await page.goto('/pricing');const categories=page.getByRole('navigation',{name:'Product categories',exact:true});await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();await categories.getByRole('button',{name:'Websites',exact:true}).click();await expect(page.getByRole('heading',{name:'Landing Page',exact:true})).toBeVisible();await categories.getByRole('button',{name:'Webcare',exact:true}).click();await expect(page.locator('#subscriptions article')).toHaveCount(2);
 expect(writes).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
