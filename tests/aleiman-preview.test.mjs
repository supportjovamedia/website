import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import config from '../next.config.mjs';
const root=fileURLToPath(new URL('../public/previews/aleiman/',import.meta.url));
const pages=['index.html','perform-umrah.html','poi-ziarah.html','contact.html'];
test('preview pages are unindexed and all local assets and navigation stay inside the preview',()=>{
  for(const page of pages){const html=readFileSync(path.join(root,page),'utf8');assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
    for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){const url=match[1];if(/^(https?:|mailto:|tel:|data:)/.test(url))continue;const relative=url.split(/[?#]/)[0];assert.ok(!relative.startsWith('/'),`${page} has a root-relative dependency ${relative}`);assert.ok(existsSync(path.join(root,relative)),`${page} missing ${relative}`)}
  }
});
test('hosted preview form never posts to the live JovaMedia contact route or stores personal data',()=>{const script=readFileSync(path.join(root,'site.js'),'utf8');assert.doesNotMatch(script,/fetch\(|\/api\/contact|localStorage|sessionStorage/);assert.match(script,/No message has been sent or saved/);const html=readFileSync(path.join(root,'contact.html'),'utf8');assert.doesNotMatch(html,/saved on this computer/)});
test('only the preview path gets additional indexing exclusions and its own entry redirect',async()=>{const headers=await config.headers();const scoped=headers.find(h=>h.source==='/previews/aleiman/:path*');assert.equal(scoped.headers[0].value,'noindex, nofollow, noarchive');const redirects=await config.redirects();assert.equal(redirects.find(r=>r.source==='/previews/aleiman').destination,'/previews/aleiman/index.html')});
