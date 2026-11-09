import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{pathToRegexp}=require('next/dist/compiled/path-to-regexp');
const root=new URL('../',import.meta.url),read=name=>readFile(new URL(name,root),'utf8');
const [html,accounts,app,google,configText,packageText]=await Promise.all(['index.html','accounts.js','app.js','google-auth.js','vercel.json','package.json'].map(read));
const config=JSON.parse(configText),pkg=JSON.parse(packageText),scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
function cacheControl(path){let value=null;for(const rule of config.headers)if(pathToRegexp(rule.source).test(path))for(const header of rule.headers)if(header.key.toLowerCase()==='cache-control')value=header.value;return value;}
test('the HTML shell loads the repaired account adapter before its matching app without renaming sessions',()=>{
 const account='/accounts.js?v=20261109-session-repair',application='/app.js?v=20261109-session-repair';assert(scripts.includes(account));assert(scripts.includes(application));assert(scripts.indexOf(account)<scripts.indexOf(application));
 assert.equal(scripts.filter(url=>url.split('?')[0]==='/accounts.js').length,1);assert.equal(scripts.filter(url=>url.split('?')[0]==='/app.js').length,1);
 assert.match(accounts,/\bAUTH\s*=\s*['"]jovabook-auth['"]/);assert.match(app,/\bSESSION\s*=\s*['"]jovabook-owner['"]/);assert.match(google,/\bmarker\s*=\s*['"]jovabook-google-start['"]/);assert.match(google,/\bstorageKey\s*=\s*['"]jovabook-google-pkce['"]/);
 for(const source of [accounts,app,google])assert.doesNotMatch(source,/(?:localStorage|sessionStorage)\.clear\s*\(/,'A deployment must not clear all saved credentials or browser records');
});
test('owner and rewritten public HTML revalidate while private APIs and versioned assets retain their cache policies',()=>{
 for(const path of ['/','/index.html','/login','/avery-studio','/avery-studio/book','/avery-studio/book/time','/avery-studio/account/login','/avery-studio/about','/avery-studio/contact'])assert.equal(cacheControl(path),'public, max-age=0, must-revalidate',path);
 for(const path of ['/api/jovabook/billing/status','/api/jovabook/integrations/status','/api/jovabook/recovery/send'])assert.equal(cacheControl(path),null,'No HTML cache policy may override '+path);
 assert.equal(cacheControl('/accounts.js'),'public, max-age=300');assert.equal(cacheControl('/app.js'),'public, max-age=300');assert.equal(cacheControl('/style.css'),'public, max-age=300');assert.match(cacheControl('/fonts/inter-latin.woff2'),/max-age=86400/);
 assert.equal(config.rewrites.find(route=>route.source==='/api/jovabook/:path*').destination,'https://www.jovamedia.com/api/jovabook/:path*');
});
test('default syntax checks and the release gate include the auth entry points and this cache contract',()=>{
 for(const file of ['accounts.js','app.js','google-auth.js','owner-onboarding.js','owner-welcome.js','owner-client-import.js','owner-diagnostics.js'])assert(pkg.scripts.check.includes('node --check '+file),file);
 assert(pkg.scripts['test:release'].includes('tests/release-cache.mjs'));
});
