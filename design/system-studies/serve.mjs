import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const allowed = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/studies.css': ['studies.css', 'text/css'], '/studies.js': ['studies.js', 'application/javascript'] };
createServer(async (req,res) => {
  const item = allowed[new URL(req.url,'http://localhost').pathname];
  if (!item) { res.writeHead(404); res.end(); return; }
  try { const content = await readFile(new URL(item[0],root)); res.writeHead(200,{'Content-Type':item[1]+'; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}); res.end(content); }
  catch { res.writeHead(500); res.end('Unable to load the local study.'); }
}).listen(4408,'127.0.0.1',()=>console.log(`Local design studies: http://127.0.0.1:4408/ (${fileURLToPath(root)})`));
