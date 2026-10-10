// Check actual menu pixels as well as clickable links. Set TEST_URL and PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:4892';
const output = path.resolve(process.env.QA_OUTPUT || '../output/JovaMedia Mobile Menu');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const [route, width, height] of [
      ['/', 390, 844], ['/', 594, 764], ['/', 768, 900], ['/', 390, 320],
      ['/about', 390, 844], ['/services', 390, 844], ['/contact', 390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('jovamedia-consent-v1', JSON.stringify({ choice: 'rejected', time: Date.now() })));
      await page.goto(new URL(route, base).href);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      const menu = page.locator('#mobile-menu');
      if (route === '/') {
        const state = await menu.evaluate(el => ({
          opacity: getComputedStyle(el).opacity,
          transition: getComputedStyle(el).transitionDuration,
          wrapperOverflow: getComputedStyle(el.closest('.jova-home-header')).overflow,
          links: [...el.querySelectorAll('a')].map(a => ({ opacity: getComputedStyle(a).opacity, transform: getComputedStyle(a).transform })),
        }));
        assert.equal(state.opacity, '1', 'Homepage menu must be opaque immediately');
        assert.equal(state.transition, '0s');
        assert.equal(state.wrapperOverflow, 'visible');
        state.links.forEach(link => { assert.equal(link.opacity, '1'); assert.equal(link.transform, 'none'); });
      } else await page.waitForTimeout(600);
      // A click test alone cannot detect a missing menu background.
      const screenshot = await page.screenshot();
      const pixel = await sharp(screenshot).extract({ left: 5, top: height - 15, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      assert.deepEqual([...pixel], [247, 247, 244], `${route} ${width}x${height}: menu surface must cover the page`);
      if (route === '/' && width === 390 && height === 844) await fs.writeFile(path.join(output, 'homepage-menu.png'), screenshot);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      if (height === 320) {
        assert.ok(await menu.evaluate(el => el.scrollHeight > el.clientHeight));
        await menu.evaluate(el => { el.scrollTop = el.scrollHeight; });
        assert.ok(await menu.evaluate(el => el.scrollTop > 0), 'Short-screen menu must scroll');
        await page.screenshot({ path: path.join(output, 'short-screen-menu.png') });
      }
      await menu.getByRole('link', { name: 'About', exact: true }).click();
      await page.waitForURL(new URL('/about', base).href);
      assert.equal(await page.locator('#main-content').evaluate(el => el.inert), false);
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.deepEqual(errors, []);
      results.push({ route, width, height, result: 'pass' });
      await page.close();
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log('PASS: immediate opaque homepage menu, visible links, menu scrolling, navigation and other routes', results);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
