import { test, expect } from "@playwright/test";
import { socialPreview } from "../../lib/social-preview.mjs";

test("legacy sharing endpoints still serve the current PNG without changing the image", async ({ request }) => {
  const asset = await request.get(socialPreview.url);
  expect(asset.ok()).toBe(true);
  const expected = await asset.body();
  expect([...expected.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const endpoint of ["/opengraph-image", "/share/jovamedia-2026", "/share/jovamedia-digital-partner"]) {
    const response = await request.get(endpoint);
    expect(response.ok(), endpoint).toBe(true);
    expect(response.headers()["content-type"], endpoint).toContain("image/png");
    expect((await response.body()).equals(expected), endpoint).toBe(true);
  }
});
