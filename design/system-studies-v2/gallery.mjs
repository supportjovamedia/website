import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const families = [
  ['booking', 'Booking', 'A customer appointment journey, built around service choice and available time.'],
  ['crm', 'CRM', 'A focused sales workspace with a pipeline, owners and clear next actions.'],
  ['portal', 'Client portal', 'A calm project room with decisions, documents and feedback together.'],
  ['membership', 'Membership', 'A content-led learning library, with lessons, resources and saved progress.'],
];
const views = [
  ['card', 'Directory overview'], ['hero', 'Detail-page hero'],
  ['scope-one', 'First supporting workflow'], ['scope-two', 'Second supporting workflow'],
  ['scope-three', 'Third supporting workflow'], ['editorial-one', 'Supporting detail'], ['editorial-two', 'Supporting settings'],
];
const images = new Map(families.flatMap(([type]) => views.map(([view]) => {
  const name = `${type}-${view}.webp`;
  return [`/exports/${name}`, new URL(`../../public/websites/systems-v2/${name}`, import.meta.url)];
})));
const figure = (type, name, [view, label]) => `<figure><a href="/exports/${type}-${view}.webp" aria-label="Open ${name}: ${label} at full size"><img src="/exports/${type}-${view}.webp" alt="${name}: ${label}, interface concept with sample data" width="1600" height="1000" loading="lazy"></a><figcaption>${label}. Open to inspect at full size.</figcaption></figure>`;
const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>JovaMedia interface design review</title><style>
*{box-sizing:border-box}body{margin:0;background:#efefeb;color:#202722;font:16px/1.6 Arial,sans-serif}header,main{width:100%;max-width:1500px;min-width:0;margin:auto;padding:32px clamp(20px,5vw,70px)}header{padding-top:60px}h1{font:500 clamp(32px,5vw,58px)/1.1 Georgia,serif;max-width:18ch;margin:15px 0}header p{max-width:68ch;color:#657164}nav{display:flex;gap:24px;flex-wrap:wrap;margin:30px 0}a{color:inherit}a:focus-visible,summary:focus-visible{outline:3px solid #2e6549;outline-offset:5px}section{border-top:1px solid #cdd2c8;padding-block:35px 65px;scroll-margin-top:20px;min-width:0}h2{font:32px Georgia,serif;margin:0 0 10px}.pair,.extra{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;min-width:0}.pair>*,.extra>*{min-width:0}figure{margin:20px 0;min-width:0}figure>a{display:block;min-width:0}img{display:block;width:100%;max-width:100%;height:auto;aspect-ratio:8/5;object-fit:contain;border-radius:8px}figcaption{font-size:13px;color:#667060;margin:10px 0;overflow-wrap:anywhere}details{margin-top:12px;min-width:0}summary{cursor:pointer;min-height:48px;padding:12px 0}.extra{margin-top:16px}.extra figure{margin:0}footer{padding:30px clamp(20px,5vw,70px);background:#242d25;color:#e7ece2}small{color:#667260}@media(max-width:850px){.pair,.extra{grid-template-columns:minmax(0,1fr)}}
</style></head><body><header><small>JOVAMEDIA / DESIGN REVIEW</small><h1>Different products.<br>Different visual stories.</h1><p>Four original interface directions. Each overview and detail image shows a different product screen. These are design concepts with fictional sample data, built in HTML and CSS with existing site photography.</p><nav aria-label="Design families">${families.map(([type, name]) => `<a href="#${type}">${name}</a>`).join('')}</nav></header><main>${families.map(([type, name, copy]) => `<section id="${type}"><h2>${name}</h2><p>${copy}</p><div class="pair">${views.slice(0, 2).map(view => figure(type, name, view)).join('')}</div><details><summary>View the five supporting screens</summary><div class="extra">${views.slice(2).map(view => figure(type, name, view)).join('')}</div></details></section>`).join('')}</main><footer>28 distinct screens. The gallery displays the actual compressed website exports in their original proportions. This is a local review, not a live publication.</footer></body></html>`;

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex,nofollow' };
  if (path === '/') { res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return; }
  if (!images.has(path)) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { ...headers, 'Content-Type': 'image/webp' }); res.end(await readFile(images.get(path))); }
  catch { res.writeHead(500); res.end('Unable to load design export'); }
}).listen(4414, '127.0.0.1', () => console.log('Final export gallery: http://127.0.0.1:4414/'));
