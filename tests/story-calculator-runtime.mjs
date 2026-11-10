import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {sections,dialogs} from '../app/jovabook/story/sections.mjs';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';
import {withInitialCalculatorMarkup} from '../app/jovabook/story/calculator.mjs';

test('calculator server state and actual inputs stay consistent across providers',async()=>{
 const moduleSource=(await readFile(new URL('../app/jovabook/story/calculator.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
 const source=moduleSource+'\n'+(await readFile(new URL('../app/jovabook/story/enhance-story.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'').replace('export function enhanceStory','function enhanceStory');
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/*',route=>route.abort());page.on('pageerror',error=>errors.push(error.message));
  const css=(await Promise.all(['../app/jovabook/landing.css','../app/jovabook/story/story.css','../app/jovabook/story/rhythm.css','../app/jovabook/story/polish.css','../app/jovabook/story/controls-finish.css','../app/button-colours.css','../app/jovabook/story/calculator-finish.css'].map(path=>readFile(new URL(path,import.meta.url),'utf8')))).join('\n');
  await page.setContent('<style>'+css+'\n[hidden]{display:none!important}body{margin:0;font-family:Arial,sans-serif}</style><main class="jovabook-story"><div id="jova-story-concept">'+sections.map(withInitialCalculatorMarkup).join('')+dialogs+'</div></main>');
  const figures=()=>page.evaluate(()=>Object.fromEntries(['ex-saving','ex-saving-unit','ex-saving-annual','ex-saving-annual-text','ex-breakdown-sub','ex-breakdown-fees','ex-current-name','ex-current-total','ex-jova-total','sw-new-clients-value'].map(id=>[id,document.getElementById(id).textContent])));
  assert.deepEqual(await page.locator('[data-competitor]').evaluateAll(buttons=>buttons.map(button=>button.dataset.competitor)),['fresha','treatwell','booksy','squarespace']);
  const server=await figures();
  await page.evaluate(({source,portalScreens})=>{window.portalScreens=portalScreens;window.eval(source+';enhanceStory(document.getElementById("jova-story-concept"));');},{source,portalScreens});
  assert.deepEqual(await figures(),server);
  await expect(page.locator('details.calculator-footnotes')).not.toHaveAttribute('open','');await expect(page.locator('#vp-example')).toBeHidden();
  for(const id of ['ex-saving','ex-saving-annual'])assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).color),'rgb(40, 103, 69)');
  const sizes=await page.evaluate(()=>['ex-saving','ex-saving-annual'].map(id=>parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));assert(sizes[0]>sizes[1],'Yearly savings is the primary figure');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.calculator-reject-icon')).color),'rgb(189, 41, 36)');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-current-total')).textDecorationLine),'line-through');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-saving-heading')).backgroundColor),'rgb(255, 215, 0)');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-saving-heading')).color),'rgb(17, 17, 17)');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-saving-heading')).borderRadius),'99px');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-saving')).fontSize),'30px');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-saving')).textDecorationLine),'none');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.vp-settings>summary'),'::after').color),'rgb(17, 17, 17)');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.vp-settings>summary'),'::after').backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await page.evaluate(()=>document.querySelector('.ex-compare-options').parentElement===document.querySelector('.vp-unified-calculator')),false);
  assert.equal(await page.evaluate(()=>document.querySelector('.vp-unified-calculator').lastElementChild.className),'calculator-footnotes');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const width of [360,390,768,1440,1920]){
   await page.setViewportSize({width,height:900});
   const layout=await page.evaluate(()=>{
    const box=selector=>{const rect=document.querySelector(selector).getBoundingClientRect();return {top:rect.top,bottom:rect.bottom,width:rect.width};};
    return {selector:box('.ex-compare-options'),content:box('.vp-unified-calculator'),current:box('.calculator-current-cost'),jova:box('.calculator-jova-cost'),savings:box('.calculator-savings-card'),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   if(width<=700){const compact=await page.locator('.ex-compare-options').evaluate(e=>({height:e.getBoundingClientRect().height,tops:[...e.querySelectorAll('button')].map(b=>b.getBoundingClientRect().top),clipped:[...e.querySelectorAll('button')].some(b=>b.scrollWidth>b.clientWidth+1)}));assert(compact.height<=52);assert(Math.max(...compact.tops)-Math.min(...compact.tops)<1);assert.equal(compact.clipped,false,'Provider labels remain readable');}
   const segments=await page.locator('.ex-compare-options button').evaluateAll(buttons=>buttons.map(button=>({top:button.getBoundingClientRect().top,width:button.getBoundingClientRect().width})));
   assert.equal(segments.length,4);assert(Math.max(...segments.map(b=>b.top))-Math.min(...segments.map(b=>b.top))<1,'All four providers stay on one row');assert(Math.max(...segments.map(b=>b.width))-Math.min(...segments.map(b=>b.width))<1,'Four providers divide the full width evenly');
   assert(Math.abs(layout.selector.width-layout.content.width)<1,'Selector and comparison share one width');
   assert(Math.abs(layout.current.top-layout.jova.top)<1,'Cost cards stay beside each other');
   assert.equal(layout.overflow,false,'No overflow at '+width);
   if(width>700){assert(Math.abs(layout.current.top-layout.savings.top)<1,'All three desktop cards share one row '+JSON.stringify(layout));}
   else{assert(layout.savings.top>layout.current.bottom,'Phone savings follows both cost cards');}
   if(width!==360)await page.locator('#ex-compare').screenshot({path:fileURLToPath(new URL('../output/calculator-implemented-'+(width>700?'desktop':'mobile')+'.png',import.meta.url))});
  }
  await page.setViewportSize({width:390,height:844});
  const openFigures=()=>page.locator('.vp-unified-calculator details').evaluateAll(details=>details.forEach(detail=>{detail.open=true;}));
  const range=value=>page.locator('#ex-new-clients').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
  const provider=async name=>{await page.locator('[data-competitor="'+name+'"]').click();await openFigures();await page.evaluate(()=>new Promise(requestAnimationFrame));};
  await openFigures();await range(0);
  await expect(page.locator('#ex-saving-heading')).toHaveText('JovaBook would cost');
  await expect(page.locator('#ex-saving')).toHaveText('£60.60');
  await expect(page.locator('.calculator-reject-icon')).toBeHidden();
  for(const id of ['ex-saving','ex-saving-annual'])assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).color),'rgb(17, 17, 17)','Costs more is never green');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#ex-current-total')).textDecorationLine),'none');
  await range(30);await expect(page.locator('#ex-breakdown-fees')).toHaveText('£300');
  await provider('booksy');await expect(page.locator('#ex-breakdown-fees')).toHaveText('£0');
  await page.locator('#ex-boost').check();await expect(page.locator('#ex-breakdown-fees')).toHaveText('£450');
  await page.locator('#ex-first-value').fill('10');await expect(page.locator('#ex-breakdown-fees')).toHaveText('£150');
  await provider('treatwell');await expect(page.locator('#ex-breakdown-sub')).toHaveText('£9.99');await expect(page.locator('#ex-breakdown-fees')).toHaveText('£105');
  await provider('fresha');await page.locator('#ex-comp-seats').fill('3');
  await expect(page.locator('#ex-breakdown-sub')).toHaveText('£29.85');await expect(page.locator('#ex-jova-total')).toHaveText('£37');
  await page.locator('#ex-fresha-insights').check();await expect(page.locator('#ex-breakdown-sub')).toHaveText('£53.70');
  await page.locator('#ex-fresha-website').check();await expect(page.locator('#ex-breakdown-site')).toHaveText('£12.95');
  await page.locator('#ex-jova-seats').fill('1');await expect(page.locator('#ex-compare-error')).toBeVisible();await expect(page.locator('#ex-current-total')).toBeEmpty();
  await page.locator('#ex-jova-seats').fill('3');await expect(page.locator('#ex-compare-error')).toBeHidden();
  await provider('booksy');await page.locator('#ex-boost').uncheck();await page.locator('#ex-comp-seats').fill('1');await expect(page.locator('#ex-breakdown-fees')).toHaveText('£0');await expect(page.locator('.vp-fx-source')).toBeHidden();
  await page.locator('#ex-jova-plan').selectOption('20');await page.locator('#ex-comp-subscription').fill('20');await page.locator('#ex-comp-website').fill('0');await expect(page.locator('#ex-saving')).toHaveText('£0');for(const id of ['ex-saving','ex-saving-annual'])assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).color),'rgb(17, 17, 17)','Zero savings is never green');
  await page.locator('#ex-comp-subscription').fill('23.75');await page.locator('#ex-comp-website').fill('12');
  await expect(page.locator('.vp-unified-calculator')).toHaveAttribute('data-needs-bill','false');await expect(page.locator('#ex-current-total')).toHaveText('£35.75');await expect(page.locator('#ex-breakdown-fees')).toHaveText('£0');await expect(page.locator('#ex-saving')).toHaveText('£189');
  await page.locator('#ex-comp-subscription').fill('');await expect(page.locator('#ex-compare-error')).toBeVisible();await expect(page.locator('#ex-saving')).toBeEmpty();await expect(page.locator('#ex-current-total')).toBeEmpty();
  await provider('squarespace');await expect(page.locator('#ex-jova-total')).toHaveText('£0');await expect(page.locator('#ex-current-total')).toHaveText('£16');await expect(page.locator('#ex-saving')).toHaveText('£192');
  await expect(page.locator('#ex-free-limit')).toBeVisible();
  await expect(page.locator('.vp-fx-source')).toBeHidden();
  await page.locator('details.calculator-footnotes').evaluate(e=>{e.open=false;});await expect(page.locator('#vp-example')).toBeHidden();await page.locator('details.calculator-footnotes>summary').click();await expect(page.locator('#vp-example')).toBeVisible();
  const footer=await page.locator('.calculator-footnotes').evaluate(e=>({top:e.getBoundingClientRect().top,settingsBottom:document.querySelector('.vp-settings').getBoundingClientRect().bottom,note:e.querySelector('#vp-example').textContent}));assert(footer.top>=footer.settingsBottom);assert(!footer.note.includes('Example:'));
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
