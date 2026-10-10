// Production-build browser checks. Set TEST_URL, PLAYWRIGHT_MODULE and optionally QA_WIDTHS.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:4893';
const output = path.resolve(process.env.QA_OUTPUT || '../output/JovaMedia Sticky Navigation');
const widths = process.env.QA_WIDTHS ? JSON.parse(process.env.QA_WIDTHS) : [390, 768, 1440, 1920, 2560, 3440];
async function move(page, top) {
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top);
  await page.waitForTimeout(80);
}
async function checkMenu(page, label) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  assert.equal(await page.locator('#mobile-menu').evaluate(el => getComputedStyle(el).opacity), '1');
  const screenshot = await page.screenshot();
  const height = page.viewportSize().height;
  const pixel = await sharp(screenshot).extract({ left: 5, top: height - 15, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.deepEqual([...pixel], [247, 247, 244], label + ': opaque menu background');
  const headerBottom = await page.locator('header.header').evaluate(el => el.getBoundingClientRect().bottom);
  const menuTop = await page.locator('#mobile-menu').evaluate(el => el.getBoundingClientRect().top);
  assert.ok(Math.abs(menuTop - headerBottom) < 1, label + ': menu aligns with header');
  await page.keyboard.press('Escape');
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  assert.equal(await page.locator('#main-content').evaluate(el => el.inert), false);
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    const xml = await (await fetch(base + '/sitemap.xml')).text();
    const allPaths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('jovamedia-consent-v1', JSON.stringify({ choice: 'rejected', time: Date.now() })));
      const routes = [390, 1440].includes(width) ? [...allPaths, '/insights'] : ['/', '/about', '/services', '/contact'];
      for (const route of routes) {
        await page.goto(new URL(route, base).href);
        await page.waitForFunction(() => document.querySelector('[data-navigation-intro]'));
        await page.evaluate(() => document.fonts.ready);
        const header = page.locator('header.header');
        const intro = page.locator('[data-navigation-intro]');
        await move(page, 0);
        await page.waitForFunction(() => document.querySelector('header.header').dataset.stuck === 'false');
        assert.equal(await header.evaluate(el => getComputedStyle(el).position), 'relative');
        if (width < 901 && ['/', '/about', '/services', '/contact'].includes(route)) await checkMenu(page, route + ' before intro');
        const boundary = await intro.evaluate(el => el.getBoundingClientRect().bottom + scrollY);
        const documentTop = await page.locator('#main-content').evaluate(el => el.getBoundingClientRect().top + scrollY);
        await move(page, boundary - 12);
        assert.equal(await header.getAttribute('data-stuck'), 'false', route + ': must stay unfixed through the intro');
        await move(page, boundary + 12);
        await page.waitForFunction(() => document.querySelector('header.header').dataset.stuck === 'true');
        assert.equal(await header.evaluate(el => getComputedStyle(el).position), 'fixed');
        assert.ok(Math.abs(await header.evaluate(el => el.getBoundingClientRect().top)) < 1);
        assert.ok(Math.abs(await intro.evaluate(el => el.getBoundingClientRect().bottom + scrollY) - boundary) < 1, route + ': intro must not jump');
        assert.ok(Math.abs(await page.locator('#main-content').evaluate(el => el.getBoundingClientRect().top + scrollY) - documentTop) < 1, route + ': header space remains reserved');
        if (width < 901 && ['/', '/about', '/services', '/contact'].includes(route)) await checkMenu(page, route + ' after intro');
        await move(page, boundary + 300);
        assert.equal(await header.getAttribute('data-stuck'), 'true');
        if (route === '/' && [390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `sticky-home-${width}.png`) });
        await move(page, boundary - 12);
        await page.waitForFunction(() => document.querySelector('header.header').dataset.stuck === 'false');
        await move(page, boundary + 12);
        await page.waitForFunction(() => document.querySelector('header.header').dataset.stuck === 'true');
        if (route === '/' && width === 390) {
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await page.setViewportSize({ width: 768, height: 900 });
          await page.waitForTimeout(100);
          assert.ok(Math.abs(await header.evaluate(el => el.getBoundingClientRect().top)) < 1, 'Open sticky menu keeps its close control after resize');
          await page.getByRole('button', { name: 'Close menu', exact: true }).click();
          await page.setViewportSize({ width, height: 900 });
          await move(page, boundary + 12);
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await page.setViewportSize({ width: 1100, height: 900 });
          await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false');
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
          assert.equal(await page.locator('#main-content').evaluate(el => el.inert), false);
          await page.setViewportSize({ width, height: 900 });
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ': no horizontal overflow');
        results.push({ width, route, result: 'pass' });
      }
      // Click the real navigation while fixed, then return to its previous scroll state.
      await page.goto(base);
      await page.waitForFunction(() => document.querySelector('[data-navigation-intro]'));
      const end = await page.locator('[data-navigation-intro]').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
      await move(page, end + 200);
      if (width < 901) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.locator(`${width < 901 ? '#mobile-menu' : '.desktop-nav'} a[href="/contact"]`).first().click();
      await page.waitForURL(new URL('/contact', base).href);
      await page.waitForFunction(() => document.querySelector('[data-navigation-intro]'));
      await page.goBack();
      await page.waitForURL(new URL('/', base).href);
      await page.waitForFunction(() => document.querySelector('header.header').dataset.stuck === 'true');
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await page.locator('#main-content').evaluate(el => el.inert), false);
      assert.deepEqual(errors, []);
      console.log('PASS sticky navigation', width, routes.length, 'pages');
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => localStorage.setItem('jovamedia-consent-v1', JSON.stringify({ choice: 'rejected', time: Date.now() })));
    await page.goto(base + '/contact#enquiry');
    await page.getByRole('combobox', { name: /^Budget/ }).waitFor();
    assert.equal(await page.locator('select[name="budget"] option').first().textContent(), 'Select your budget');
    assert.doesNotMatch(await page.locator('main').innerText(), /monthly budget|For ongoing support/i);
    await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    assert.equal(await page.locator('#budget-error').textContent(), 'Please select your budget.');
    await page.locator('select[name="budget"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'budget-mobile.png') });
    await page.close();
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results, budgetLabelAndValidation: 'pass' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
