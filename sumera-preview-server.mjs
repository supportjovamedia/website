import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('public');
const port = Number(process.env.SUMERA_PREVIEW_PORT || 4176);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
http.createServer((request,response) => {
  let uri;
  try { uri = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  if (uri === '/') { response.writeHead(302, {Location:'/previews/sumera/index.html'}); response.end(); return; }
  if (uri === '/previews/sumera' || uri === '/previews/sumera/') uri = '/previews/sumera/index.html';
  const file = path.resolve(root, '.' + uri);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow, noarchive'});
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Sumera preview: http://localhost:${port}/previews/sumera/index.html`));
