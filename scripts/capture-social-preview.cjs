// Export a current localhost screenshot through the supported browser tool,
// then run: node scripts/capture-social-preview.cjs <absolute-screenshot-path>
// Keep the homepage at the top, use a desktop viewport and dismiss the cookie dialog.
// This script processes the captured pixels without controlling a browser.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const imagePath = 'public/share/jovamedia-hero-2026-10.png';
const sourcePaths = ['components/StudioHome.js', 'components/DaybreakHero.js', 'components/DaybreakHero.module.css', 'components/StudioHome.module.css', 'app/studio.css', 'components/Header.js', 'scripts/capture-social-preview.cjs', 'public/brand/jova-logo.png'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceSha = (bytes, file) => sha(file.endsWith('.png') ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n'));
(async () => {
  const input = process.argv[2];
  if (!input || !path.isAbsolute(input)) throw Error('Supply the absolute path of a current localhost homepage screenshot.');
  const metadata = await sharp(input).metadata();
  if (metadata.width < 1200 || metadata.height < 630) throw Error('Use a desktop screenshot at least 1200 by 630 pixels.');
  const recovery = path.resolve('..', 'output', 'jova-white-redesign', 'originals');
  await fs.mkdir(recovery, { recursive: true });
  await fs.copyFile(input, path.join(recovery, 'social-preview-source.png'));
  await sharp(input).resize({ width: 1200, height: 630, fit: 'cover', position: 'top' }).png().toFile(imagePath);
  await fs.copyFile(imagePath, 'public/share/jovamedia-homepage-2026-09.png');
  const sources = {};
  for (const file of sourcePaths) sources[file] = sourceSha(await fs.readFile(file), file);
  await fs.writeFile('public/share/social-preview-manifest.json', JSON.stringify({ image: '/share/jovamedia-hero-2026-10.png', width: 1200, height: 630, sha256: sha(await fs.readFile(imagePath)), sources }, null, 2) + '\n');
  console.log('Saved current homepage share image, with stripped metadata and source freshness checks.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
