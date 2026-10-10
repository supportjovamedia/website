// Run against a production build with TEST_URL and, if needed, PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:4891';
const output = path.resolve(process.env.QA_OUTPUT || '../output/JovaMedia Navigation Fix');

async function settle(page) { await page.waitForTimeout(400); }
async function centre(page, selector, index = 0) {
  await page.locator(selector).nth(index).evaluate(element => {
    const rect = element.getBoundingClientRect();
    window.scrollTo({ top: scrollY + rect.top + rect.height / 2 - innerHeight / 2, behavior: 'instant' });
  });
  await settle(page);
}
async function roundTripScroll(page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await settle(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForFunction(() => scrollY < 1);
  await settle(page);
}
async function menuUnlocked(page) {
  assert.equal(await page.locator('#main-content').evaluate(el => el.inert), false, 'Page content must accept clicks');
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'Scroll lock must be released');
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const width of [390, 768, 1440, 1920, 2560, 3440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('jovamedia-consent-v1', JSON.stringify({ choice: 'rejected', time: Date.now() }));
        window.documentVisit = crypto.randomUUID();
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.mouse.move(0, 0);
      assert.equal(await page.locator('[data-service-row][data-highlighted="true"]').count(), 0);
      const rows = page.locator('[data-service-row]');
      assert.equal(await rows.count(), 8);
      for (const index of [...Array(8).keys(), ...[...Array(8).keys()].reverse()]) {
        await centre(page, '[data-service-row]', index);
        const states = await rows.evaluateAll(elements => elements.map(el => ({
          active: el.dataset.highlighted === 'true',
          arrow: getComputedStyle(el.querySelector('svg')).transform,
          colour: getComputedStyle(el.querySelector('a>span')).backgroundColor,
        })));
        assert.deepEqual(states.map((state, i) => state.active ? i : -1).filter(i => i >= 0), [index], `${width}px: only current service should be active`);
        for (const [i, state] of states.entries()) {
          assert.equal(state.colour, i === index ? 'rgb(239, 24, 60)' : 'rgb(249, 250, 248)');
          assert.equal(state.arrow, i === index ? 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)' : 'matrix(1, 0, 0, 1, 0, 0)');
        }
      }
      await centre(page, '[data-service-row]', 1);
      if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `services-${width}.png`) });
      await centre(page, '[data-contact-focus]');
      assert.equal(await page.locator('[data-service-row][data-highlighted="true"]').count(), 0, 'Services clear after leaving the section');
      const talk = page.locator('[data-contact-focus] a[aria-label="Start a project"]');
      assert.equal(await talk.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 221, 72)');
      if (width === 1440) await page.screenshot({ path: path.join(output, 'lets-talk-desktop.png') });
      await roundTripScroll(page);
      assert.equal(await talk.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no horizontal overflow`);

      // Repeat the user's exact down/up journey before clicking each primary link.
      for (const href of ['/about', '/services', '/contact']) {
        await roundTripScroll(page);
        const visit = await page.evaluate(() => window.documentVisit);
        if (width < 901) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        const nav = width < 901 ? '#mobile-menu' : '.desktop-nav';
        await page.locator(`${nav} a[href="${href}"]`).first().click();
        await page.waitForURL(new URL(href, base).href);
        await page.locator('h1').waitFor();
        assert.notEqual(await page.evaluate(() => window.documentVisit), visit, 'Main navigation must be browser-native');
        await menuUnlocked(page);
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.waitForURL(new URL('/', base).href);
        await menuUnlocked(page);
      }
      if (width < 901) {
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await page.keyboard.press('Escape');
        await menuUnlocked(page);
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await page.setViewportSize({ width: 1100, height: 900 });
        await settle(page);
        await menuUnlocked(page);
        await page.setViewportSize({ width, height: 900 });
      }
      // Exercise hero links, service cards and the closing CTA, not just HTTP routes.
      if ([390, 1440].includes(width)) {
        const clickChecks = [
          ['.message .primary', '/contact'],
          ['.message .secondary', '/services/web-design'],
          ['.enquiry', '/contact#enquiry'],
          ...await rows.locator('a').evaluateAll(elements => elements.map(el => [`#services a[href="${el.getAttribute('href')}"]`, el.getAttribute('href')])),
          ['[data-contact-focus] a[aria-label="Start a project"]', '/contact'],
        ];
        for (const [selector, href] of clickChecks) {
          const link = page.locator(selector);
          await link.click();
          await page.waitForURL(new URL(href, base).href);
          await page.locator('h1').waitFor();
          await menuUnlocked(page);
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await page.waitForURL(new URL('/', base).href);
        }
      }
      assert.deepEqual(errors, [], `${width}px: no uncaught browser errors`);
      results.push({ width, serviceFocusBothDirections: 'pass', navigationAfterScrollAndBack: 'pass', overflow: 'pass' });
      console.log('PASS', width);
      await context.close();
    }
    // Colour focus remains usable without motion, including browsers lacking view timelines.
    for (const reducedMotion of ['reduce', 'no-preference']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
      await page.goto(base);
      if (reducedMotion === 'no-preference') await page.addStyleTag({ content: '[data-service-row] a,[data-service-row] a>div:first-child{animation:none!important}' });
      for (const index of [0, 1, 7, 3, 0]) {
        await centre(page, '[data-service-row]', index);
        assert.equal(await page.locator('[data-service-row][data-highlighted="true"]').count(), 1);
        assert.equal(await page.locator('[data-service-row]').nth(index).getAttribute('data-highlighted'), 'true');
      }
      await page.close();
    }
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await staticPage.goto(base);
    await staticPage.locator('.desktop-nav a[href="/about"]').click();
    await staticPage.waitForURL(new URL('/about', base).href);
    await staticPage.close();
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results, reducedMotion: 'pass', fallback: 'pass', navigationWithoutJavaScript: 'pass' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
