import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const target = 'http://127.0.0.1:4414/';
const output = process.argv[2];
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.REGRESSION_BROWSER_CHANNEL ? { channel: process.env.REGRESSION_BROWSER_CHANNEL } : {}) });
const page = await browser.newPage();
const results = [];
try {
  for (const width of [320, 390, 768, 850, 1024, 1262, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(target);
    for (const summary of await page.locator('summary').all()) await summary.click();
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element => element.decode());
    }
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      images: [...document.images].map(image => {
        const box = image.getBoundingClientRect();
        return { source: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0,
          ratioError: Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight),
          left: box.left, right: box.right };
      }),
    }));
    assert.equal(geometry.images.length, 28, `Missing gallery images at ${width}px`);
    assert.ok(geometry.overflow <= 1, `Horizontal overflow at ${width}px`);
    for (const image of geometry.images) {
      assert.ok(image.loaded && image.ratioError < .01 && image.left >= 0 && image.right <= width + 1,
        `Stretched, overflowing or unloaded image at ${width}px: ${JSON.stringify(image)}`);
    }
    results.push({ width, images: 28, overflow: geometry.overflow, distortedImages: 0 });
    if (output && [390, 1262].includes(width)) {
      await page.locator('#booking .extra figure').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `gallery-fixed-${width}.png`) });
    }
  }
} finally { await browser.close(); }
if (output) await writeFile(path.join(output, 'gallery-layout-audit.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
