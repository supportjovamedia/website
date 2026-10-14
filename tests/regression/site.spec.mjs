import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { CONSENT_KEY } from '../../lib/marketing-analytics.mjs';
import { businessPhone } from '../../lib/business-contact.mjs';

const trackedAssets = new Set(execFileSync('git', ['-c', `safe.directory=${process.cwd().replaceAll('\\', '/')}`, 'ls-files', 'public'], { encoding: 'utf8' }).trim().split(/\r?\n/));

const products = [
  ['landing-page', 'Landing Page', '£350'],
  ['business-website', 'Business Website', '£550'],
  ['booking-system', 'Website with Booking System', '£2,000'],
];
const pages = ['/', '/about', '/services', '/pricing', '/contact', '/get-a-quote', '/privacy-policy', '/terms'];

test.beforeEach(async ({ context, page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  // Read-only on previews and production: never send leads, bookings or chat messages.
  // Third-party analytics/chat/CAPTCHA are checked separately, not loaded into QA sessions.
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
  await context.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({ choice: 'rejected', time: Date.now() }));
  }, { key: CONSENT_KEY });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  test.info().annotations.push({ type: 'coverage', description: 'First-party UI, GET-only requests, mocked delivery handlers' });
  // Checked after every browser journey, including hydration and click handlers.
  page.__regressionErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.__regressionErrors).toEqual([]);
});

test('WhatsApp and call routes use the verified business number without requiring a form', async ({ page }) => {
  for (const path of ['/', '/contact', '/get-a-quote']) {
    await page.goto(path);
    const link = page.locator('main').getByRole('link', { name: 'Chat on WhatsApp', exact: true });
    await expect(link).toBeVisible();
    const url = new URL(await link.getAttribute('href'));
    expect(url.origin + url.pathname).toBe(businessPhone.whatsapp);
    expect(url.searchParams.get('text')).toMatch(/^Hi JovaMedia,/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(link).toHaveCSS('text-decoration-line', 'none');
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    if (path !== '/') {
      const call = page.locator('main').getByRole('link', { name: `Call ${businessPhone.display}`, exact: true });
      await expect(call).toBeVisible();
      await expect(call).toHaveAttribute('href', businessPhone.tel);
      await expect(page.locator('main')).not.toContainText(/(?:27|57) minutes/);
    }
    await noOverflow(page);
  }
});

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('cookie choices dismiss the dialog and remain editable', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Reject all', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).choice, CONSENT_KEY)).toBe('rejected');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Analytics and session replays' })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('core pages render, headings stay unclipped, images load, and links resolve', async ({ page, request, baseURL }) => {
  const links = new Set();
  for (const path of pages) {
    const response = await page.goto(path);
    expect(response.status(), path).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toBeVisible();
    await expect.poll(() => page.locator('main h1').evaluate(el => getComputedStyle(el).clipPath)).toBe('none');
    await noOverflow(page);
    // Include lazy images without needing an unreliable full-page scroll animation.
    const images = await page.locator('img').evaluateAll(elements => elements.map(el => el.currentSrc || el.src));
    for (const src of new Set(images)) {
      const url = new URL(src);
      const asset = url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname;
      if (asset?.startsWith('/') && !asset.startsWith('/_next/')) {
        expect(trackedAssets.has(`public${decodeURIComponent(asset)}`), `Asset missing from Git: ${asset}`).toBe(true);
      }
      const image = await request.get(src);
      expect(image.ok(), `${path}: ${src}`).toBe(true);
      expect(image.headers()['content-type'], src).toMatch(/^image\//);
    }
    for (const href of await page.locator('a[href]').evaluateAll(elements => elements.map(el => el.getAttribute('href')))) {
      const url = new URL(href, baseURL);
      if (url.origin === new URL(baseURL).origin) links.add(url.pathname + url.search);
    }
    if (path === '/about') {
      await expect(page.locator('main')).not.toContainText('Abdul');
      await expect(page.locator('main')).toContainText('Since 2016');

    }
  }
  for (const path of links) {
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.ok(), `Broken internal link: ${path}`).toBe(true);
  }
});

test('all published sitemap routes remain available', async ({ request, baseURL }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const locations = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  expect(locations.length).toBeGreaterThan(10);
  for (const path of locations) {
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.ok(), path).toBe(true);
    const html = await response.text();
    expect((html.match(/<h1[\s>]/g) || []).length, path).toBe(1);
    expect(html, path).toContain('rel="canonical"');
  }
  expect((await request.get('/this-page-must-not-exist')).status()).toBe(404);
});

test('pricing retains every inclusion and aligns desktop comparison rows', async ({ page }, testInfo) => {
  await page.goto('/pricing');
  const cards = page.locator('article').filter({ has: page.getByRole('heading', { name: /Landing Page|Business Website|Website with Booking System/, exact: true }) });
  await expect(cards).toHaveCount(3);
  for (const [index, [id, name, amount]] of products.entries()) {
    const card = cards.nth(index);
    await expect(card.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(card).toContainText(amount);
    for (const feature of ['Contact form', 'Search engine friendly', 'Custom code, no templates', 'Free client review before launch', 'Terms of service & privacy policy', `${[3, 10, 25][index]} GB website storage`]) {
      await expect(card).toContainText(feature);
    }
    await expect(card.getByRole('link', { name: `Get a Quote for ${name}`, exact: true })).toHaveAttribute('href', `/get-a-quote?product=${id}`);
  }
  const geometry = await cards.evaluateAll(elements => elements.map(el => ({
    height: el.getBoundingClientRect().height,
    rows: [...el.querySelectorAll('li')].map(row => ({ y: row.getBoundingClientRect().top, hidden: getComputedStyle(row).display === 'none' })),
  })));
  if (testInfo.project.name === 'desktop') {
    for (const card of geometry) {
      expect(Math.abs(card.height - geometry[0].height)).toBeLessThan(1);
      expect(card.rows).toHaveLength(18);
      card.rows.forEach((row, index) => expect(Math.abs(row.y - geometry[0].rows[index].y)).toBeLessThan(1));
    }
  } else {
    const missing = page.locator('li[aria-label$="not included"]');
    for (const row of await missing.all()) await expect(row).toBeHidden();
  }
  const booking = cards.nth(2);
  await expect(booking.getByRole('heading', { name: 'Plus your booking system', exact: true })).toHaveCSS('text-align', 'center');
  await expect(booking).toContainText('Your own booking admin panel');
  await expect(booking).toContainText('Free booking panel demo with you');
  await noOverflow(page);
});

test('each product quote button selects the correct product and keeps phone optional', async ({ page }) => {
  for (const [id, name, amount] of products) {
    await page.goto('/pricing');
    await page.getByRole('link', { name: `Get a Quote for ${name}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/get-a-quote\\?product=${id}$`));
    const selected = page.getByRole('region', { name: 'Selected product' });
    await expect(selected).toContainText(name);
    await expect(selected).toContainText(amount);
    await expect(page.locator('input[name="phone"]')).not.toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Request a quote', exact: true }).click();
    await expect(page.locator('input[name="name"]')).toBeFocused();
    await expect(page.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
  }
});

test('homepage FAQ cards are shared by contact and service pages, with readable answers on every screen', async ({ page }) => {
  let homeStyle;
  for (const path of ['/', '/contact', '/services', '/services/web-design']) {
    await page.goto(path);
    const faq = page.locator('[data-site-faq]');
    await expect(faq).toHaveCount(1);
    await faq.scrollIntoViewIfNeeded();
    await expect(faq.getByRole('heading', { level: 2 })).toHaveText('Good questions.Clear answers.');
    const cards = faq.locator('details');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    const style = await cards.first().evaluate(el => {
      const css = getComputedStyle(el);
      return { border: css.borderRadius, background: css.backgroundColor, padding: css.padding, heading: getComputedStyle(el.querySelector('h3')).fontSize };
    });
    if (path === '/') homeStyle = style;
    else expect(style, path).toEqual(homeStyle);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect(card).not.toHaveAttribute('open');
      await card.locator('summary').click();
      await expect(card).toHaveAttribute('open', '');
      await expect(card.locator('p')).toBeVisible();
      expect(await card.locator('p').innerText()).not.toBe('');
      await card.locator('summary').press('Enter');
      await expect(card).not.toHaveAttribute('open');
    }
    await noOverflow(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => cards.first().evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  await page.goto('/contact#faq');
  await expect(page.locator('[data-site-faq]').getByRole('link', { name: 'Get a Quote', exact: true })).toHaveAttribute('href', '/get-a-quote');
});

test('technology hero photos cover their banners with readable navy overlays and safe parallax', async ({ page }, testInfo) => {
  const sources = new Set();
  for (const path of ['/about', '/services', '/pricing', '/contact']) {
    await page.goto(path);
    const hero = page.locator('[data-photo-hero]');
    const image = hero.locator('img');
    const backdrop = hero.locator('[data-hero-backdrop]');
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    sources.add(await image.getAttribute('src'));
    await expect(image).toHaveCSS('opacity', '1');
    await expect(hero.locator('[data-hero-overlay]')).toHaveCSS('background-color', 'rgba(7, 27, 41, 0.92)');
    await expect(hero.locator('h1')).toHaveCSS('color', 'rgb(255, 255, 255)');
    if (testInfo.project.name === 'desktop') await expect.poll(() => backdrop.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
    const offset = () => backdrop.evaluate(el => {
      const transform = getComputedStyle(el).transform;
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    });
    const first = await offset();
    await page.evaluate(() => window.scrollTo({ top: 220, behavior: 'instant' }));
    if (testInfo.project.name === 'desktop') {
      await expect.poll(async () => (await offset()) - first).toBeGreaterThan(20);
    } else await expect(backdrop).toHaveCSS('transform', 'none');
    expect(await hero.evaluate(el => {
      const a = el.getBoundingClientRect(), b = el.querySelector('[data-hero-backdrop]').getBoundingClientRect();
      return b.top <= a.top && b.bottom >= a.bottom && b.left <= a.left && b.right >= a.right;
    })).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(backdrop).toHaveCSS('transform', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await noOverflow(page);
  }
  expect(sources.size).toBe(4);
});

test('white newsletters separate preceding sections from compact gray footers', async ({ page }) => {
  for (const path of ['/', '/about', '/services', '/pricing', '/contact', '/privacy-policy', '/terms', '/services/web-design', '/services/email-marketing']) {
    await page.goto(path);
    const newsletter = page.getByRole('region', { name: 'A little perspective for your inbox.', exact: true });
    await newsletter.scrollIntoViewIfNeeded();
    await expect(newsletter).toBeVisible();
    const backgrounds = await page.evaluate(() => {
      const background = el => {
        while (el && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(el).backgroundColor)) el = el.parentElement;
        return el ? getComputedStyle(el).backgroundColor : 'rgb(255, 255, 255)';
      };
      const sections = [...document.querySelectorAll('main > section')];
      const newsletter = document.querySelector('[data-analytics-form="newsletter"]').closest('section');
      return [background(sections.at(-1)), background(newsletter)];
    });
    expect(backgrounds[0], path).not.toBe(backgrounds[1]);
    await expect(newsletter).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('footer')).toHaveCSS('background-color', 'rgb(243, 244, 246)');
    await expect(page.locator('footer')).toHaveCSS('padding-bottom', '18px');
    if (path.startsWith('/services/')) {
      const related = page.getByRole('heading', { name: 'Explore related services', exact: true }).locator('xpath=ancestor::section');
      await expect(related).toHaveCSS('background-color', 'rgb(243, 244, 246)');
    }
    await noOverflow(page);
  }
});

test('navigation works after scrolling and mobile menu releases its scroll lock', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  if (testInfo.project.name === 'phone') {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(page.locator('#main-content')).toHaveJSProperty('inert', true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#main-content')).toHaveJSProperty('inert', false);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('#mobile-menu').getByRole('link', { name: 'About', exact: true }).click();
  } else {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'About', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator('#main-content')).toHaveJSProperty('inert', false);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('service chapters pin on phones and laptops while every active panel fits', async ({ page }, testInfo) => {
  await page.goto('/');
  const story = page.getByRole('region', { name: 'A little more than a website.', exact: true });
  const sizes = testInfo.project.name === 'phone'
    ? [[320, 740], [360, 800], [390, 844], [430, 932], [768, 900]]
    : [[901, 540], [1024, 600], [1366, 650], [1440, 800], [1920, 1080], [2560, 650]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect(story).toHaveAttribute('data-pinned', 'true');
    await expect(story.locator(':scope > div')).toHaveCSS('position', 'sticky');
    for (let chapter = 0; chapter < 3; chapter++) {
      await story.getByRole('navigation', { name: 'Explore services' }).getByRole('button').nth(chapter).click();
      await expect(story).toHaveAttribute('data-chapter', String(chapter));
      const active = story.locator('article[data-active=true]');
      await expect(active).not.toHaveAttribute('inert', '');
      await expect(active.getByRole('link', { name: 'Learn more', exact: true })).toBeVisible();
      const bounds = await active.evaluate(card => {
        const parts = [...card.children];
        return parts.every(part => {
          const rect = part.getBoundingClientRect();
          const top = parseFloat(getComputedStyle(card.closest('[data-service-story]')).getPropertyValue('--story-top'));
          return rect.top >= top - 1 && rect.bottom <= innerHeight + 1 && rect.left >= 0 && rect.right <= innerWidth;
        });
      });
      expect(bounds, `${width}x${height}, chapter ${chapter}: full image and copy fit below navigation`).toBe(true);
      await expect(story.locator('article[inert]')).toHaveCount(2);
    }
    // Actual page scrolling, as well as chapter buttons, must advance the story.
    await story.evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top + (el.offsetHeight - innerHeight) * .45, behavior: 'instant' }));
    await expect(story).toHaveAttribute('data-chapter', '1');
    await noOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(story).toHaveAttribute('data-pinned', 'false');
  await expect(story.locator('article[inert]')).toHaveCount(0);
  await expect(story.locator(':scope > div')).toHaveCSS('position', 'static');
  if (testInfo.project.name === 'phone') {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(story).toHaveAttribute('data-pinned', 'false');
    await expect(story.locator('article[inert]')).toHaveCount(0);
    await expect(story.locator(':scope > div')).toHaveCSS('position', 'static');
  }
});

test('FAQ progress advances on every screen and stays aligned after expansion', async ({ page }) => {
  await page.goto('/contact#faq');
  const faq = page.locator('[data-site-faq]');
  const markers = faq.locator('[data-story-marker]');
  await markers.first().scrollIntoViewIfNeeded();
  const first = await faq.evaluate(el => Number(el.style.getPropertyValue('--line')));
  await markers.last().scrollIntoViewIfNeeded();
  await expect.poll(() => faq.evaluate(el => Number(el.style.getPropertyValue('--line')))).toBeGreaterThan(first);
  const card = faq.locator('details').first();
  await card.locator('summary').click();
  await expect.poll(() => faq.evaluate(el => {
    const track = el.querySelector('[data-story-track]');
    const markers = [...el.querySelectorAll('[data-story-marker]')];
    const centre = marker => { const box = marker.getBoundingClientRect(); return box.top + box.height / 2; };
    return Math.abs(parseFloat(getComputedStyle(track, '::before').height) - (centre(markers.at(-1)) - centre(markers[0])));
  })).toBeLessThan(1);
});

test('layout stays within phone, tablet, short desktop and ultrawide viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One shared responsive sweep avoids duplicate work.');
  for (const [width, height] of [[320, 740], [768, 900], [1001, 900], [1440, 650], [1920, 1080], [2560, 1440], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    for (const path of ['/', '/pricing', '/services']) {
      await page.goto(path);
      await noOverflow(page);
      if (path === '/') {
        const contained = await page.locator('.showcase').evaluate(el => {
          const hero = el.closest('.hero').getBoundingClientRect();
          return [...el.querySelectorAll('.device')].every(device => {
            const rect = device.getBoundingClientRect();
            return rect.left >= hero.left - 1 && rect.right <= hero.right + 1 && rect.bottom <= hero.bottom + 1;
          });
        });
        expect(contained, `${width}px homepage device frames`).toBe(true);
      }
    }
  }
});
