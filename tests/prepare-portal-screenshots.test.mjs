import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {screenshotSources,validateScreenshotDimensions,preparePortalScreenshots} from '../scripts/prepare-portal-screenshots.mjs';
test('All Mobile and theme.mobile sources require phone-sized portrait dimensions; all Desktop sources require landscape',()=>{
 const sources=screenshotSources('synthetic-archive');assert.equal(sources.length,28);assert.equal(sources.filter(source=>source.device==='mobile').length,14);
 for(const entry of sources){
  assert.doesNotThrow(()=>validateScreenshotDimensions(entry,entry.device==='mobile'?{width:390,height:844}:{width:1440,height:1100}));
  assert.throws(()=>validateScreenshotDimensions(entry,{width:390,height:390}),/must be/);
  assert.throws(()=>validateScreenshotDimensions(entry,{width:0,height:844}),/invalid/);
  assert.throws(()=>validateScreenshotDimensions(entry,{width:undefined,height:844}),/invalid/);
  assert.throws(()=>validateScreenshotDimensions(entry,entry.device==='mobile'?{width:1440,height:1100}:{width:390,height:844}),/must be/);
  if(entry.device==='mobile'){const scale=entry.pixelRatio||1;assert.throws(()=>validateScreenshotDimensions(entry,{width:601*scale,height:1000*scale}),/600/);if(scale===2)assert.doesNotThrow(()=>validateScreenshotDimensions(entry,{width:780,height:1688}));}
 }
});
test('A bad final theme screenshot rejects before any assets or manifests change and preserves every source original',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'jovabook-screenshot-preflight-')),archive=path.join(temp,'archive'),destination=path.join(temp,'assets'),moduleTarget=path.join(temp,'portal-screens.mjs');
 try{
  const landscape=await sharp({create:{width:80,height:60,channels:3,background:'#fff'}}).jpeg().toBuffer(),portrait=await sharp({create:{width:39,height:84,channels:3,background:'#fff'}}).jpeg().toBuffer(),entries=screenshotSources(archive),originals=new Map();
  for(const entry of entries){const bytes=entry.device==='mobile'&&entry.key!=='theme.studio.mobile'?portrait:landscape;await mkdir(path.dirname(entry.source),{recursive:true});await writeFile(entry.source,bytes);originals.set(entry.source,bytes);}
  await mkdir(destination);await writeFile(path.join(destination,'manifest.json'),'existing asset manifest');await writeFile(moduleTarget,'existing source module');await writeFile(path.join(archive,'capture-manifest.json'),'existing capture manifest');
  await assert.rejects(preparePortalScreenshots({archive,destination,moduleTarget}),/theme|studio-mobile/);assert.deepEqual(await readdir(destination),['manifest.json']);assert.equal(await readFile(path.join(destination,'manifest.json'),'utf8'),'existing asset manifest');assert.equal(await readFile(moduleTarget,'utf8'),'existing source module');assert.equal(await readFile(path.join(archive,'capture-manifest.json'),'utf8'),'existing capture manifest');for(const [file,bytes]of originals)assert.deepEqual(await readFile(file),bytes);
  const absentDestination=path.join(temp,'not-created');await assert.rejects(preparePortalScreenshots({archive,destination:absentDestination,moduleTarget}),/studio-mobile/);await assert.rejects(readdir(absentDestination),{code:'ENOENT'});
 }finally{assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(temp).startsWith('jovabook-screenshot-preflight-'),'Cleanup stays inside its named temporary test directory');await rm(temp,{recursive:true,force:true});}
});
