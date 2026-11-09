import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {verifyJovaBookRelease,RELEASE_TARGETS} from '../verify-jovabook-release.mjs';
import {bundlePage} from '../../booking-demo/build-assets.mjs';

const COMMIT='1'.repeat(40),OLDER='2'.repeat(40),TOKEN='local-test-token-never-report';
const root=new URL('../../booking-demo/',import.meta.url),sources=new Map([['index.html',await readFile(new URL('index.html',root),'utf8')],['operator.html',await readFile(new URL('operator.html',root),'utf8')]]);
for(const document of ['index.html','operator.html'])for(const match of sources.get(document).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)){
 const file=new URL(match[1],'https://'+RELEASE_TARGETS.booking.host+'/'+document).pathname.slice(1);sources.set(file,await readFile(new URL(file,root),'utf8'));
}
const sdk=sources.get('google-auth.js').match(/script\.src\s*=\s*['"]([^'"]+\/supabase-[^'"]+\.js)['"]/)[1].slice(1);
sources.set(sdk,await readFile(new URL(sdk,root),'utf8'));
sources.set('build-assets.mjs',await readFile(new URL('build-assets.mjs',root),'utf8'));
const served=new Map([['config.js',sources.get('config.js')],[sdk,sources.get(sdk)]]),bundles=[],manifest={version:1,pages:{}};
for(const [page,document] of [['owner','index.html'],['operator','operator.html']]){
 const result=await bundlePage({html:sources.get(document),page,readSource:file=>sources.get(file)});
 served.set(document,result.html);for(const asset of result.assets){served.set(asset.file,asset.body);bundles.push({...asset,page});}
 manifest.pages[page]={document,assets:result.assets.map(({body,...metadata})=>metadata)};
}
served.set('asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const ownerCss=bundles.find(asset=>asset.page==='owner'&&asset.file.endsWith('.css')),ownerJs=bundles.find(asset=>asset.sources.some(source=>source.file==='accounts.js')),operatorJs=bundles.find(asset=>asset.sources.some(source=>source.file==='operator.js'));

async function fixture(run){
 const mode={oldBooking:false,missingAsset:false,mixedAsset:false,mixedOperator:false,missingSource:false,wrongMainProject:false,metadataDenied:false,oldHtml:false,unbundledHtml:false,wrongSourceSha:false,missingManifest:false,missingSdk:false},requests=[];
 const server=http.createServer((req,res)=>{
  requests.push({method:req.method,path:req.url});assert.equal(req.method,'GET');const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/vercel/v13/deployments/')){
   assert.equal(req.headers.authorization,'Bearer '+TOKEN);if(mode.metadataDenied){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({secret:TOKEN}));return;}
   const host=decodeURIComponent(url.pathname.split('/').at(-1)),name=host===RELEASE_TARGETS.booking.host?'booking':'main',target=RELEASE_TARGETS[name];
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({id:'dpl_local_'+name,projectId:mode.wrongMainProject&&name==='main'?'prj_wrong':target.projectId,target:'production',readyState:'READY',alias:[host],meta:{githubCommitSha:mode.oldBooking&&name==='booking'?OLDER:COMMIT}}));return;
  }
  const file=url.pathname==='/book/'?'index.html':url.pathname.replace(/^\/book\//,''),body=served.get(file);
  if(!body||mode.missingAsset&&file===ownerCss.file||mode.missingManifest&&file==='asset-manifest.json'||mode.missingSdk&&file===sdk){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/javascript','Cache-Control':mode.shortCache?'public, max-age=300':'public, max-age=31536000, immutable'});
  if(mode.wrongSourceSha&&file==='asset-manifest.json'){const wrong=structuredClone(manifest);wrong.pages.owner.assets[0].sources[0].sha256='0'.repeat(64);res.end(JSON.stringify(wrong,null,2)+'\n');return;}
  res.end(mode.mixedAsset&&file===ownerJs.file?'window.OLD_ACCOUNTS=true;':mode.mixedOperator&&file===operatorJs.file?'window.OLD_OPERATOR=true;':mode.oldHtml&&file==='index.html'?'<html>Old dashboard</html>':mode.unbundledHtml&&file==='index.html'?sources.get('index.html'):body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const fetcher=(address,options)=>{const url=new URL(address);assert(['api.vercel.com',RELEASE_TARGETS.booking.host].includes(url.hostname));return fetch(base+(url.hostname==='api.vercel.com'?'/vercel':'/book')+url.pathname+url.search,options);};
 const check=extra=>verifyJovaBookRelease({expectedCommit:COMMIT,vercelToken:TOKEN,fetcher,readSource:(_commit,file)=>{if(!sources.has(file)||mode.missingSource&&file==='refunds.js')throw Error('Missing fixture');return sources.get(file);},...extra});
 try{await run({mode,requests,check});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

test('matching dual-project deployments and critical asset bytes pass without writing anything',async()=>fixture(async({check,requests})=>{
 const report=await check();assert.equal(report.ok,true,JSON.stringify(report.checks.filter(check=>!check.ok)));assert(report.checks.some(check=>check.name==='asset:'+sdk));assert.equal(report.checks.filter(check=>check.name.startsWith('deployment:')).length,2);assert(report.checks.some(check=>check.name==='asset:'+ownerJs.file));assert.equal(requests.filter(request=>request.path.includes('/book/assets/')).length,bundles.length);assert(!requests.some(request=>request.path==='/book/accounts.js'));assert(!JSON.stringify(report).includes(TOKEN));
}));
test('a newer main/API deployment with an older booking alias fails the release',async()=>fixture(async({mode,check})=>{
 mode.oldBooking=true;const report=await check();assert.equal(report.ok,false);assert.equal(report.checks.find(check=>check.name==='deployment:booking').actualCommit,OLDER);
}));

test('correct bundle bytes with the old short browser cache fail verification',async()=>fixture(async({mode,check})=>{
 mode.shortCache=true;const report=await check();assert.equal(report.ok,false);assert(report.checks.some(row=>row.name.startsWith('cache:')&&!row.ok));
}));
test('missing CSS bundle, stale or unbundled HTML and mixed cached bundles each fail independently',async()=>fixture(async({mode,check})=>{
 for(const [flag,name] of [['missingAsset','asset:'+ownerCss.file],['oldHtml','asset:index.html'],['unbundledHtml','asset:index.html'],['mixedAsset','asset:'+ownerJs.file],['mixedOperator','asset:'+operatorJs.file],['missingSource','source:index.html']]){mode[flag]=true;const report=await check();assert.equal(report.ok,false,flag);assert.equal(report.checks.find(check=>check.name===name).ok,false,flag);mode[flag]=false;}
}));
test('a different approved bundler source cannot verify output built by this checkout',async()=>fixture(async({check})=>{
 const report=await check({readSource:(_commit,file)=>file==='build-assets.mjs'?'// older builder':sources.get(file)});assert.equal(report.ok,false);assert.equal(report.checks.find(check=>check.name==='source:build-assets.mjs').ok,false);
}));
test('missing manifest, wrong source SHA and missing lazy Google SDK fail even with matching HTML and bundles',async()=>fixture(async({mode,check})=>{
 for(const [flag,name] of [['missingManifest','asset:asset-manifest.json'],['wrongSourceSha','asset:asset-manifest.json'],['missingSdk','asset:'+sdk]]){mode[flag]=true;const report=await check();assert.equal(report.ok,false,flag);assert.equal(report.checks.find(check=>check.name===name).ok,false,flag);mode[flag]=false;}
}));
test('approved source reads may resolve asynchronously without changing expected output',async()=>fixture(async({check})=>{
 const report=await check({readSource:async(_commit,file)=>sources.get(file)});assert.equal(report.ok,true,JSON.stringify(report.checks.filter(check=>!check.ok)));
}));
test('missing commit or metadata credentials cannot produce a green release result',async()=>fixture(async({check,requests})=>{
 await assert.rejects(check({expectedCommit:undefined}),/full approved/);await assert.rejects(check({expectedCommit:'main'}),/full approved/);await assert.rejects(check({vercelToken:''}),/No release was verified/);assert.equal(requests.length,0);
}));
test('unavailable deployment evidence and a wrong main project fail without exposing credentials',async()=>fixture(async({mode,check})=>{
 mode.metadataDenied=true;let report=await check();assert.equal(report.ok,false);assert(!JSON.stringify(report).includes(TOKEN));assert.equal(report.checks.filter(check=>check.name.startsWith('deployment:')&&!check.ok).length,2);
 mode.metadataDenied=false;mode.wrongMainProject=true;report=await check();assert.equal(report.ok,false);assert.equal(report.checks.find(check=>check.name==='deployment:main').ok,false);
}));
