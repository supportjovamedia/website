import { test, expect } from '@playwright/test';
import { CONSENT_KEY } from '../../lib/marketing-analytics.mjs';
import { websiteTypes, websitePath, websiteQuotePath } from '../../lib/website-catalogue.mjs';

test.beforeEach(async ({ context, page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
  await context.addInitScript(({ key }) => localStorage.setItem(key, JSON.stringify({ choice: 'rejected', time: Date.now() })), { key: CONSENT_KEY });
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
});

test.afterEach(async ({ page }) => expect(page.__errors).toEqual([]));

test('the Websites introduction keeps the approved wording and the footer exposes the official social accounts', async ({ page }, testInfo) => {
  await page.goto('/websites');
  if (testInfo.project.name === 'desktop') await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true }).locator('a')).toHaveText(['Home', 'About', 'Website', 'Services', 'Pricing', 'Blog']);
  const hero = page.locator('main [data-website-intro]');
  await expect(hero.locator('h1')).toHaveText('Affordable website design in London.');
  await expect(page).toHaveTitle('Affordable Website Design in London | JovaMedia');
  await expect(hero).toContainText('An ecommerce shop.');
  await expect(hero).not.toContainText('Harrow');
  await expect(hero.locator('a[href="/get-a-quote"], a[href="#website-types"]')).toHaveCount(0);
  await expect(page.locator('#find-your-website a[href="/get-a-quote"]')).toBeVisible();
  await expect(page.locator('main a[href="/websites/business-websites"]').first()).toBeVisible();
  const social = page.getByRole('navigation', { name: 'JovaMedia social profiles', exact: true });
  await social.scrollIntoViewIfNeeded();
  await expect(social.locator('a')).toHaveCount(4);
  for (const [label, href] of [
    ['JovaMedia on Instagram','https://www.instagram.com/jovamediaofficial/'],
    ['JovaMedia on Facebook','https://www.facebook.com/jovamediaofficial/'],
    ['JovaMedia on TikTok','https://www.tiktok.com/@jovamediaofficial'],
  ]) {
    const link = social.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href',href);
    await expect(link).toHaveAttribute('rel',/\bme\b/);
    const bounds = await link.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await expect(social.getByRole('link', { name: 'Chat with JovaMedia on WhatsApp', exact: true })).toHaveAttribute('href',/^https:\/\/wa\.me\/447356266655\?/);
  const organisations = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(organisations.some(text => JSON.parse(text)['@graph']?.some(item => item['@type'] === 'Organization' && item.sameAs?.includes('https://www.facebook.com/jovamediaofficial/')))).toBe(true);
});

test('retired previews return 404 while Aleiman and the booking service remain available', async ({ request }) => {
  for (const path of ['/preview/booking', '/preview/booking/admin', '/preview/booking/account', '/preview/booking/api/public/catalog', '/previews/sumera', '/previews/sumera/index.html']) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
  expect((await request.get('/previews/aleiman/index.html')).status()).toBe(200);
  expect((await request.get('/websites/booking-systems')).status()).toBe(200);
});

test('website pages reflow, show the right metadata, load photography and preserve the enquiry choice', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  for (const path of ['/websites', ...websiteTypes.map(item => websitePath(item.slug))]) {
    expect((await page.goto(path)).status(), path).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveCSS('color', 'rgb(255, 255, 255)');
    if (path !== '/websites') {
      const questions = page.locator('main #questions details');
      expect(await questions.count()).toBeGreaterThanOrEqual(5);
      for (const answer of await questions.locator('p').all()) expect((await answer.textContent()).trim().length).toBeGreaterThan(20);
      const first = questions.first();
      await first.locator('summary').click();
      await expect(first).toHaveAttribute('open', '');
      await expect(first.locator('p')).toBeVisible();
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.jovamedia.com${path}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    const h1 = await page.locator('main h1').boundingBox();
    expect(h1.x).toBeGreaterThanOrEqual(0);
    expect(h1.x + h1.width).toBeLessThanOrEqual(page.viewportSize().width);
    if (page.viewportSize().width <= 900) {
      const bounds = await page.locator('main [data-website-intro]').evaluate(el => {
        const copy = el.querySelector('h1').parentElement;
        const art = copy.nextElementSibling;
        return { copy: copy.getBoundingClientRect().bottom, art: art.getBoundingClientRect().top };
      });
      expect(bounds.art, path + ' photography must sit after the introduction').toBeGreaterThanOrEqual(bounds.copy - 1);
    }
    await expect.poll(() => page.locator('main [data-website-intro] img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    for (const image of await page.locator('main [data-photo-kind="interface"] img').all()) {
      await expect(image, path + ' interface screenshots must preserve their proportions').toHaveCSS('object-fit', 'contain');
      await expect(image).toHaveAttribute('width', '1600');
      await expect(image).toHaveAttribute('height', '1000');
    }
    if (path === '/websites' || path === '/websites/crm-systems') {
      await page.screenshot({ path: `test-results/websites-${path === '/websites' ? 'overview' : 'crm'}-${testInfo.project.name}.png` });
    }
  }
  for (const slug of ['booking-systems', 'crm-systems', 'membership-websites']) {
    const item = websiteTypes.find(item => item.slug === slug);
    await page.goto(websitePath(slug));
    await page.locator('main').getByRole('link', { name: 'Discuss your project', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`website=${slug}`));
    await expect(page.locator('select[name="service"]')).toHaveValue(`website-${slug}`);
    expect(new URL(websiteQuotePath(item), 'https://www.jovamedia.com').pathname).toBe('/get-a-quote');
  }
});

test('Websites and Services have separate mobile groups with keyboard return and every type reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Mobile navigation interaction');
  await page.goto('/websites');
  const open = page.getByRole('button', { name: 'Open menu', exact: true });
  await open.click();
  await expect(page.locator('#mobile-menu .mobile-menu-page[data-active="true"]').locator(':scope > a, :scope > button')).toHaveText(['Home', 'About', 'Website', 'Services', 'Pricing', 'Get a Quote']);
  await page.getByRole('button', { name: 'Website', exact: true }).click();
  const websiteMenu = page.locator('#mobile-websites');
  await expect(websiteMenu.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  for (const item of websiteTypes) {
    const link = websiteMenu.locator(`a[href="${websitePath(item.slug)}"]`);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }
  await websiteMenu.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Website', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Services', exact: true }).click();
  await expect(page.locator('#mobile-services')).not.toContainText('Website design');
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-hidden', 'true');
});

test('navigation stays usable at the desktop breakpoint and at 320px', async ({ page }) => {
  for (const width of [320, 768, 1024, 1100, 1101, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/websites');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), String(width)).toBe(true);
    if (width <= 1100) await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
    else {
      const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
      await expect(nav.getByRole('link', { name: 'Website', exact: true })).toBeVisible();
      const navBox = await nav.boundingBox();
      const actionBox = await page.locator('.desktop-cta').boundingBox();
      expect(navBox.x + navBox.width).toBeLessThan(actionBox.x);
    }
  }
});

test('every service has working desktop chapters or phone swipe pagination', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  for (const item of websiteTypes) {
    await page.goto(websitePath(item.slug));
    const story = page.locator('main #scope');
    const desktop = testInfo.project.name === 'desktop';
    const controls = desktop ? story.getByRole('group', { name: 'Explore the website scope', exact: true }) : story.getByRole('group', { name: 'Choose a website scope detail', exact: true });
    await controls.scrollIntoViewIfNeeded();
    const buttons = controls.getByRole('button');
    await buttons.last().click();
    await expect(buttons.last()).toHaveAttribute('aria-pressed', 'true');
    const last = story.locator('[id="scope-chapter-2"]');
    await expect(last).toBeInViewport();
    await expect(last.getByRole('heading', { level: 3 })).toBeVisible();
    if (desktop) {
      await expect(story).toHaveAttribute('data-pinned', 'true');
      await expect(story.locator('[id="scope-chapter-0"]')).toHaveAttribute('inert', '');
      await expect(last).not.toHaveAttribute('inert', '');
    } else {
      const geometry = await story.locator('[aria-label="Website scope details"]').evaluate(el => ({ left: el.scrollLeft, content: el.scrollWidth, width: el.clientWidth }));
      expect(geometry.left).toBeGreaterThan(0);
      expect(geometry.content).toBeGreaterThan(geometry.width);
    }
    await buttons.first().click();
    await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true');
  }
});

test('reduced motion keeps every service chapter readable without pinning', async ({ page }) => {
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const item of websiteTypes) {
    await page.goto(websitePath(item.slug));
    const story = page.locator('main #scope');
    await expect(story).toHaveAttribute('data-pinned', 'false');
    await expect(story.locator('[inert]')).toHaveCount(0);
    for (const card of await story.locator('[id^="scope-chapter-"]').all()) {
      await expect(card.getByRole('heading', { level: 3 })).toBeVisible();
      expect(await card.evaluate(el => getComputedStyle(el).visibility)).toBe('visible');
    }
  }
});

test('the hub and service content remain useful before JavaScript', async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  for (const path of ['/websites', ...websiteTypes.map(item => websitePath(item.slug))]) {
    expect((await page.goto(origin + path)).status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main a[href^="/get-a-quote"]').first()).toBeVisible();
    if (path !== '/websites') {
      await expect(page.locator('#scope [inert]')).toHaveCount(0);
      await page.locator('#questions details').first().locator('summary').click();
      await expect(page.locator('#questions details').first().locator('p')).toBeVisible();
    }
  }
  await context.close();
});
