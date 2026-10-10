import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://localhost:3100';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local tests only');

test('public pages omit decorative section and card indices while retaining FAQ references', async () => {
  const xml = await (await fetch(base + '/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  for (const path of [...paths, '/insights']) {
    const html = await (await fetch(base + path)).text();
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(markup, />\s*\(?0[1-9]\)?(?:\s*\/[^<]*|\s*)</, path + ' has a decorative index');
    if (path === '/') {
      for (const number of ['01', '02', '03', '04']) assert.ok(markup.includes('QUESTION ' + number), 'Keep FAQ reference ' + number);
    }
  }
});
