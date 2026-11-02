import {test,expect} from '@playwright/test';

test('JovaBook plan choice, real themes and FAQ work without a scroll stopper',async({page})=>{
 await page.goto('/jovabook');await expect(page.locator('main h1')).toHaveCount(1);
 await expect(page.getByRole('heading',{name:'The tools behind a more organised day.'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Useful controls for your working day.'})).toHaveCount(0);
 await expect(page.getByRole('navigation',{name:'Explore the booking workspace'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Pause animation',exact:true})).toHaveCount(0);
 const cta=page.locator('main').getByRole('link',{name:'Try JovaBook for free',exact:true}).first();await expect(cta).toHaveAttribute('href','#plans');await expect(page.locator('[data-jovabook-story]')).toHaveAttribute('data-motion',/active|reduced|static/);await cta.click();await expect(page).toHaveURL(/#plans$/);await expect(page.locator('#plans-title')).toBeFocused();await expect.poll(()=>page.locator('#plans').evaluate(el=>{const top=el.getBoundingClientRect().top;return top>=80&&top<=240;})).toBe(true);
 await page.getByRole('button',{name:'Yearly Save 20%',exact:true}).click();const plans=page.getByRole('region',{name:'JovaBook plans',exact:true});
 for(const total of ['£192 billed yearly','£480 billed yearly','£960 billed yearly'])await expect(plans).toContainText(total);
 await expect(plans.getByRole('link',{name:'Try JovaBook for free',exact:true}).first()).toHaveAttribute('href',/cadence=annual/);
 const themes=page.getByRole('group',{name:'Preview workspace colours',exact:true});
 for(const name of ['Jova Blue','Rose Studio','Midnight Glass','Forest','Warm Studio','Amethyst']){
  const button=themes.getByRole('button',{name,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');const image=page.getByRole('img',{name:`Actual JovaBook dashboard in the ${name} workspace theme`,exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(i=>i.naturalWidth>=i.getBoundingClientRect().width)).toBe(true);
 }
 const walkthrough=page.locator('#customer-booking');const requests=[];const track=request=>{if(/supabase|\/api\//i.test(request.url())||request.method()!=='GET')requests.push(request.url());};page.on('request',track);
 await walkthrough.getByRole('button',{name:/Lash lift/}).click();await walkthrough.getByRole('button',{name:'Choose date & time',exact:true}).click();await walkthrough.getByRole('button',{name:'Tue 10',exact:true}).click();await walkthrough.getByRole('button',{name:'10:30',exact:true}).click();await walkthrough.getByRole('button',{name:'Continue to details',exact:true}).click();await expect(walkthrough.getByRole('textbox')).toHaveCount(0);await walkthrough.getByRole('button',{name:'Review booking',exact:true}).click();await expect(walkthrough.getByText('You have reached the end of the walkthrough. Nothing has been booked or sent.')).toBeVisible();await expect(walkthrough.getByRole('button',{name:/confirm|pay now/i})).toHaveCount(0);await expect(walkthrough.getByLabel('Walkthrough booking summary')).toContainText('£55.00');await walkthrough.getByRole('button',{name:'Start again',exact:true}).click();await expect(walkthrough.getByRole('heading',{name:'Book a service',exact:true})).toBeVisible();page.off('request',track);expect(requests).toEqual([]);
 await expect(page.locator('section[aria-labelledby="business-types-title"] article img')).toHaveCount(6);await expect(page.locator('#business-setup')).toHaveCount(0);await expect(page.locator('#workspace-features')).toHaveCount(0);
 const order=await page.evaluate(()=>['demo','booking-partner-title','customer-booking','included-website','workspace-theme-title','business-insights','plans'].map(id=>document.getElementById(id).getBoundingClientRect().top+scrollY));expect(order).toEqual([...order].sort((a,b)=>a-b));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const faq=page.locator('[data-site-faq]');await faq.locator('summary').nth(0).click();await faq.locator('summary').nth(1).click();await expect(faq.locator('details[open]')).toHaveCount(1);await expect(faq.locator('details').nth(0)).not.toHaveAttribute('open');
 expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).toContain('PT1M42S');
});

test('Pricing starts with JovaBook and retains Websites and Webcare',async({page})=>{
 await page.goto('/pricing');const categories=page.getByRole('navigation',{name:'Product categories',exact:true});await expect(categories.getByRole('button')).toHaveText(['JovaBook','Websites','Webcare']);await expect(categories.getByRole('button',{name:'JovaBook',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();
 await categories.getByRole('button',{name:'Websites',exact:true}).click();await expect(page.getByRole('heading',{name:/landing page/i}).first()).toBeVisible();
 await categories.getByRole('button',{name:'Webcare',exact:true}).click();await expect(page.locator('#subscriptions article')).toHaveCount(2);await expect(page.locator('#subscriptions')).toContainText('£39');await expect(page.locator('#subscriptions')).toContainText('£99');
 await categories.getByRole('button',{name:'JovaBook',exact:true}).click();await expect(page.getByRole('region',{name:'JovaBook plans',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
