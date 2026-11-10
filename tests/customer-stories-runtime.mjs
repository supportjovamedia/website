import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {chromium} from '@playwright/test';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');

test('customer stories keep all five server-rendered quotes with compact phone and desktop layouts',async()=>{
 const swc=require('next/dist/build/swc');await swc.loadBindings();
 const {code}=await swc.transform(await readFile(new URL('../app/jovabook/story/CustomerStories.js',import.meta.url),'utf8'),{filename:'CustomerStories.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
 let active=0;const exports={},hooks={...React,useState:()=>[active,()=>{}],useRef:()=>({current:null})};
 vm.runInNewContext(code,{exports,React,require:()=>hooks});
 const css=(await Promise.all(['../app/jovabook/landing.css','../app/jovabook/story/story.css','../app/jovabook/story/rhythm.css','../app/jovabook/story/polish.css','../app/jovabook/story/controls-finish.css','../app/jovabook/story/customer-stories.css'].map(file=>readFile(new URL(file,import.meta.url),'utf8')))).join('\n');
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage();await page.route('**/*',route=>route.abort());await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [360,390,768,1440]){
   const heights=[];
   await page.setViewportSize({width,height:900});
   for(active=0;active<5;active++){
    const markup=renderToStaticMarkup(exports.default());
    await page.setContent('<style>'+css+'\nbody{margin:0;font-family:Arial,sans-serif}</style><main class="jovabook-story"><div id="jova-story-concept">'+markup+'</div></main>');
    const result=await page.evaluate(()=>({articles:document.querySelectorAll('.cs-card').length,visible:[...document.querySelectorAll('.cs-card')].filter(card=>card.getBoundingClientRect().height>0&&getComputedStyle(card).visibility!=='hidden').length,height:document.querySelector('.cs-grid').getBoundingClientRect().height,animation:getComputedStyle(document.querySelector('[data-story-state=featured] .cs-story-body')).animationName,overflow:document.documentElement.scrollWidth>innerWidth+1,quote:getComputedStyle(document.querySelector('[data-story-state=featured] blockquote')).color,quoteLeft:document.querySelector('[data-story-state=featured] blockquote').getBoundingClientRect().left,iconLeft:document.querySelector('[data-story-state=featured] .cs-quote-icon').getBoundingClientRect().left,mark:document.querySelectorAll('.cs-card mark').length}));
    assert.equal(result.articles,5);assert.equal(result.visible,1);assert.equal(result.overflow,false,'Overflow at '+width+' story '+active);assert.equal(result.quote,'rgb(255, 255, 255)');assert.equal(result.mark,0);assert.equal(result.animation,'none');heights.push(result.height);assert(Math.abs(result.quoteLeft-result.iconLeft)<1,'Opening quote remains left aligned');
    if(active===0&&width!==360)await page.locator('.cs-stories').screenshot({path:fileURLToPath(new URL('../output/customer-stories-'+(width>700?'desktop':'mobile')+'.png',import.meta.url))});
   }
   assert(Math.max(...heights)-Math.min(...heights)<1,'Story changes preserve card height at '+width);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const motion=await page.locator('[data-story-state=featured] .cs-story-body').evaluate(el=>({name:getComputedStyle(el).animationName,duration:getComputedStyle(el).animationDuration}));assert.equal(motion.name,'cs-story-enter');assert.equal(motion.duration,'0.18s');
  assert(await page.locator('[data-story-state=hidden] .cs-story-body').evaluateAll(elements=>elements.every(el=>getComputedStyle(el).animationName==='none')));
 }finally{await browser.close();}
});
