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

test('website pages reflow, show the right metadata, load photography and preserve the enquiry choice', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  for (const path of ['/websites', ...websiteTypes.map(item => websitePath(item.slug))]) {
    expect((await page.goto(path)).status(), path).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.jovamedia.com${path}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    const h1 = await page.locator('main h1').boundingBox();
    expect(h1.x).toBeGreaterThanOrEqual(0);
    expect(h1.x + h1.width).toBeLessThanOrEqual(page.viewportSize().width);
    if (page.viewportSize().width <= 760) {
      const overlap = await page.locator('main [data-website-intro]').evaluate(el => {
        const figure = el.querySelector('figure');
        const picture = figure.querySelector('[aria-hidden="true"]');
        const previous = figure.previousElementSibling;
        return picture.getBoundingClientRect().top < previous.getBoundingClientRect().bottom - 1;
      });
      expect(overlap, path + ' artwork must not cover the introduction').toBe(false);
    }
    await expect.poll(() => page.locator('main img[fetchpriority="high"]').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
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
  await page.getByRole('button', { name: 'Websites', exact: true }).click();
  const websiteMenu = page.locator('#mobile-websites');
  await expect(websiteMenu.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  for (const item of websiteTypes) {
    const link = websiteMenu.locator(`a[href="${websitePath(item.slug)}"]`);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }
  await websiteMenu.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Websites', exact: true })).toBeFocused();
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
      await expect(nav.getByRole('link', { name: 'Websites', exact: true })).toBeVisible();
      const navBox = await nav.boundingBox();
      const actionBox = await page.locator('.desktop-cta').boundingBox();
      expect(navBox.x + navBox.width).toBeLessThan(actionBox.x);
    }
  }
});
