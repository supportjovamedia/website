import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {bundlePage} from '../build-assets.mjs';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
const require=createRequire(import.meta.url),{pathToRegexp}=require('next/dist/compiled/path-to-regexp');
const hash=value=>createHash('sha256').update(value.replaceAll('\r\n','\n')).digest('hex');

test('production pages have bounded asset fan-out and deterministic valid classic bundles',async()=>{
 for(const [page,file,budget] of [['owner','index.html',4],['operator','operator.html',3]]){
  const html=await read(file),first=await bundlePage({html,readSource:read,page}),second=await bundlePage({html,readSource:read,page});assert.deepEqual(first,second);
  const urls=[...first.html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map(match=>match[1]);assert.equal(urls.length,budget);
  assert.equal(urls.filter(url=>url.includes('config.js')).length,1);assert.equal(first.html.includes('/vendor/supabase-'),false,'Google SDK remains lazy');
  for(const asset of first.assets){assert.match(asset.url,/^\/assets\/(owner|operator)-(entry|app|styles)\.[a-f0-9]{20}\.(js|css)$/);assert.equal(asset.sha256,hash(asset.body));for(const source of asset.sources)assert.equal(source.sha256,hash(await read(source.file)));if(asset.file.endsWith('.js'))new vm.Script(asset.body);else assert.doesNotMatch(asset.body,/url\(["']?fonts\//);}
  assert(first.html.indexOf('config.js')<first.html.indexOf(first.assets.find(asset=>asset.file.includes('-app.')).url),'Runtime config precedes application execution');
 }
});

test('changing a script changes its bundle URL without invalidating unchanged CSS',async()=>{
 const html=await read('index.html'),before=await bundlePage({html,readSource:read,page:'owner'}),after=await bundlePage({html,page:'owner',readSource:async file=>(await read(file))+(file==='accounts.js'?'\n/* changed account adapter */':'')});
 assert.notEqual(before.assets.find(asset=>asset.file.includes('-app.')).url,after.assets.find(asset=>asset.file.includes('-app.')).url);
 assert.equal(before.assets.find(asset=>asset.file.endsWith('.css')).url,after.assets.find(asset=>asset.file.endsWith('.css')).url);
});

test('only content-addressed bundles receive a year cache while HTML and private APIs keep their policies',async()=>{
 const config=JSON.parse(await read('vercel.json')),policy=url=>{let result;for(const rule of config.headers)if(pathToRegexp(rule.source).test(url))for(const header of rule.headers)if(header.key.toLowerCase()==='cache-control')result=header.value;return result;};
 for(const url of ['/assets/owner-app.1234567890abcdef1234.js','/assets/operator-styles.1234567890abcdef1234.css'])assert.equal(policy(url),'public, max-age=31536000, immutable');
 for(const url of ['/app.js','/accounts.js','/config.js','/assets/unversioned.js'])assert.equal(policy(url),'public, max-age=300');
 assert.equal(policy('/'),'public, max-age=0, must-revalidate');assert.equal(policy('/api/jovabook/billing/status'),undefined);assert.equal(config.buildCommand,'node build-assets.mjs');assert.equal(config.outputDirectory,'dist');
});
