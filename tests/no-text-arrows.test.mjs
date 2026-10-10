import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const arrow = /[\u2190-\u21ff\u27f0-\u27ff\u2900-\u297f\u2794\u279c\u27a1\u2b05-\u2b07]|&(?:rarr|larr|uarr|darr|nearr|searr);|&#(?:8(?:5(?:9[2-9]|[1-8]\d)|6\d\d)|x(?:21[9a-f][\da-f]|27(?:9[4c]|a1)|2b0[5-7]));|\\u(?:21[9a-f][\da-f]|27(?:9[4c]|a1)|2b0[5-7])/i;

async function scan(dir) {
  const matches = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) matches.push(...await scan(file));
    else if (/\.(?:[cm]?[jt]sx?|css|html|json|svg)$/.test(file)) {
      const source = await readFile(file, 'utf8');
      source.split(/\r?\n/).forEach((line, index) => {
        if (arrow.test(line)) matches.push(`${file}:${index + 1}`);
      });
    }
  }
  return matches;
}

test('site UI and hosted previews contain no emoji or text-character arrows', async () => {
  const matches = (await Promise.all(['app', 'components', 'lib', 'public'].map(scan))).flat();
  assert.deepEqual(matches, [], `Replace text arrows with clear labels or proper functional SVG controls:\n${matches.join('\n')}`);
});
