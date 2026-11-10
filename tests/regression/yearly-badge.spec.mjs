import {expect, test} from '@playwright/test';

for (const path of ['/', '/pricing']) {
  test(`Yearly badge is centred on ${path} in the production build`, async ({browser, baseURL, viewport}) => {
    const origin = new URL(baseURL).origin;
    const page = await browser.newPage({baseURL, viewport, javaScriptEnabled: false});
    try {
      await page.route('**/*', route =>
        new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
      );
      await page.goto(path);
      const button = page.locator('#ex-pricing [data-cadence=annual]');
      const badge = button.getByText('Save 20%', {exact: true});
      await expect(badge).toBeVisible();

      const buttonBounds = await button.boundingBox();
      const badgeBounds = await badge.boundingBox();
      const centre = bounds => bounds.x + bounds.width / 2;
      expect(Math.abs(centre(buttonBounds) - centre(badgeBounds))).toBeLessThan(1);
    } finally {
      await page.close();
    }
  });
}
