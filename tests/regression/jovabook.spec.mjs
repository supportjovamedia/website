import {test,expect} from '@playwright/test';
import {CONSENT_KEY} from '../../lib/marketing-analytics.mjs';

test.beforeEach(async({context,page,baseURL})=>{
 const origin=new URL(baseURL).origin;page.__writes=[];page.__errors=[];
 await context.route('**/*',route=>{const request=route.request();if(request.method()!=='GET')page.__writes.push(request.url());return new URL(request.url()).origin===origin&&request.method()==='GET'?route.continue():route.abort();});
 await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({choice:'rejected',time:Date.now()})),CONSENT_KEY);
 page.on('pageerror',error=>page.__errors.push(error.message));
});
test.afterEach(async({page})=>{expect(page.__writes).toEqual([]);expect(page.__errors).toEqual([]);});

test('JovaBook plan choice, six real themes and FAQ work with the current interactive preview',async({page})=>{
 await page.goto('/jovabook');await expect(page.locator('main h1')).toHaveCount(1);
 await expect(page.getByRole('navigation',{name:'Explore the booking workspace'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Pause animation',exact:true})).toHaveCount(0);
 const cta=page.locator('.ws-hero-actions').getByRole('link',{name:'Start free today',exact:true});
 await expect(cta).toHaveAttribute('href','#plans');await cta.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/#plans$/);
 const plans=page.locator('#plans');await expect(plans.getByRole('heading',{name:/Start free/})).toBeVisible();
 await expect.poll(()=>plans.evaluate(el=>{const top=el.getBoundingClientRect().top;return top>=120&&top<=360;})).toBe(true);
 // A native fragment link moves the keyboard sequence to the destination controls.
 await page.keyboard.press('Tab');await expect(plans.getByRole('button',{name:'Monthly',exact:true})).toBeFocused();
 await plans.getByRole('button',{name:'Yearly Save 20%',exact:true}).click();
 for(const total of ['£192 billed yearly','£240 billed yearly'])await expect(plans).toContainText(total);
 const trialLinks=plans.locator('article a');await expect(trialLinks).toHaveCount(3);
 for(const [index,plan] of ['essential','standard','premium'].entries())await expect(trialLinks.nth(index)).toHaveAttribute('href',new RegExp('plan='+plan+'&cadence='+(plan==='essential'?'monthly':'annual')+'#signup$'));
 const themes=page.getByRole('group',{name:'Workspace colour previews',exact:true}),screens=new Set();
 await expect(themes.getByRole('button')).toHaveCount(6);
 for(const name of ['Jova Blue','Rose Studio','Midnight Glass','Forest','Warm Studio','Amethyst']){
  const button=themes.getByRole('button',{name,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  const image=page.getByRole('img',{name:name+' JovaBook workspace',exact:true});await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>=i.getBoundingClientRect().width)).toBe(true);screens.add(await image.getAttribute('src'));
 }
 expect(screens.size).toBe(6);
 const walkthrough=page.locator('#booking-demo'),requests=[];const track=request=>{if(/supabase|\/api\//i.test(request.url())||request.method()!=='GET')requests.push(request.url());};page.on('request',track);
 await expect(walkthrough.getByText('Interactive demo',{exact:true})).toBeVisible();
 await walkthrough.getByRole('button',{name:/Gel manicure/}).click();await walkthrough.getByRole('button',{name:'Choose a date',exact:true}).click();
 await walkthrough.getByRole('button',{name:'Wed 11 Nov',exact:true}).click();await walkthrough.getByRole('button',{name:'14:30',exact:true}).click();
 await walkthrough.getByRole('button',{name:'See review',exact:true}).click();await expect(walkthrough.getByRole('heading',{name:'Review this appointment',exact:true})).toBeFocused();
 for(const value of ['Gel manicure','Wed 11 Nov','14:30','£35','Preview complete. No appointment has been made.'])await expect(walkthrough).toContainText(value);
 await expect(walkthrough.getByRole('textbox')).toHaveCount(0);await expect(walkthrough.getByRole('button',{name:/confirm|pay now/i})).toHaveCount(0);
 await walkthrough.getByRole('button',{name:'Try again',exact:true}).click();await expect(walkthrough.getByRole('heading',{name:'Choose your service',exact:true})).toBeVisible();page.off('request',track);expect(requests).toEqual([]);
 await expect(page.locator('.ws-industries article img')).toHaveCount(6);
 const order=await page.evaluate(()=>['#demo','#calendar','#booking','#features','#website','#workspace','.ws-insights','.ws-industries','#plans','#questions'].map(selector=>document.querySelector(selector).getBoundingClientRect().top+scrollY));expect(order).toEqual([...order].sort((a,b)=>a-b));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const faq=page.locator('[data-site-faq]');await faq.locator('summary').nth(0).click();await faq.locator('summary').nth(1).click();await expect(faq.locator('details[open]')).toHaveCount(1);await expect(faq.locator('details').nth(0)).not.toHaveAttribute('open');
 expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).toContain('PT1M15S');
});

test('Pricing starts with JovaBook and retains Websites and Webcare',async({page})=>{
 await page.goto('/pricing');const categories=page.getByRole('navigation',{name:'Product categories',exact:true});await expect(categories.getByRole('button')).toHaveText(['JovaBook','Websites','Webcare']);await expect(categories.getByRole('button',{name:'JovaBook',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();
 await categories.getByRole('button',{name:'Websites',exact:true}).click();await expect(page.getByRole('heading',{name:/landing page/i}).first()).toBeVisible();
 await categories.getByRole('button',{name:'Webcare',exact:true}).click();await expect(page.locator('#subscriptions article')).toHaveCount(2);await expect(page.locator('#subscriptions')).toContainText('£39');await expect(page.locator('#subscriptions')).toContainText('£99');
 await categories.getByRole('button',{name:'JovaBook',exact:true}).click();await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
