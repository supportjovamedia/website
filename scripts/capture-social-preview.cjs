// Authoring tool: set PLAYWRIGHT_MODULE when Playwright is supplied by the workspace.
// Start the current site locally, then run this with SOCIAL_PREVIEW_URL set to that URL.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const sharp=require('sharp');
const imagePath='public/share/jovamedia-hero-2026-10.png';
const sourcePaths=['components/DaybreakHero.js','components/DaybreakHero.module.css','scripts/capture-social-preview.cjs','public/brand/jova-logo-white.png'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const base=process.env.SOCIAL_PREVIEW_URL||'http://127.0.0.1:4887/';
 if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Capture the current local build, not a possibly stale live deployment.');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.addInitScript(()=>localStorage.setItem('jovamedia-consent-v1',JSON.stringify({choice:'rejected',time:Date.now()})));
  await page.goto(base);
  const hero=page.locator('section[aria-labelledby="home-title"]');
  await hero.locator('.showcase.ready').waitFor();
  await hero.evaluate(async el=>{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})))});
  // Reflow the real hero for the share-card aspect ratio. This changes only the capture.
  await hero.evaluate(el=>{
   el.querySelectorAll('.scrollTrack').forEach(t=>{const a=t.getAnimations()[0];a.pause();a.currentTime=0});
   const logo=document.createElement('img');logo.src='/brand/jova-logo-white.png';logo.alt='JovaMedia';logo.className='socialLogo';
   el.querySelector('.message').prepend(logo);
   const style=document.createElement('style');style.textContent=`
    body{margin:0!important}section[aria-labelledby="home-title"]{width:1200px!important;height:630px!important}
    section[aria-labelledby="home-title"] .hero{height:630px!important;min-height:0!important;padding:28px 38px!important;grid-template-columns:47% 53%!important}
    section[aria-labelledby="home-title"] .message{padding:0 10px 0 0!important}
    section[aria-labelledby="home-title"] .socialLogo{width:140px;height:auto;display:block;margin-bottom:30px}
    section[aria-labelledby="home-title"] .message h1{font-size:45px!important;line-height:1.08!important;margin:0 0 24px!important}
    section[aria-labelledby="home-title"] .description{font-size:16px!important;max-width:410px!important;margin-bottom:26px!important}
    section[aria-labelledby="home-title"] .actions{font-size:12px!important;gap:10px!important}
    section[aria-labelledby="home-title"] .actions a{min-height:44px!important;padding:13px 20px!important}
    section[aria-labelledby="home-title"] .facts{display:none!important}
    section[aria-labelledby="home-title"] .showcase{height:574px!important;aspect-ratio:auto!important;--launch-height:82px}
    section[aria-labelledby="home-title"] .launch{padding:12px 16px!important;width:43%!important}
    section[aria-labelledby="home-title"] .launch strong{font-size:19px!important}
    section[aria-labelledby="home-title"] .launch>span{font-size:10px!important}
    section[aria-labelledby="home-title"] .stages{font-size:10px!important;margin-top:8px!important}
    section[aria-labelledby="home-title"] .browser{width:95%!important;left:0!important;top:100px!important}
    section[aria-labelledby="home-title"] .browser>.screen{height:58cqw!important}
    section[aria-labelledby="home-title"] .phone{width:29%!important;top:42%!important;right:0!important;border-width:6px!important;border-radius:28px!important}
    section[aria-labelledby="home-title"] .phone>.screen{border-radius:20px!important}
    section[aria-labelledby="home-title"] .enquiry{left:0!important;bottom:0!important;width:66%!important;padding:12px 16px!important;border-radius:15px!important}
    section[aria-labelledby="home-title"] .enquiry strong{font-size:13px!important}
    section[aria-labelledby="home-title"] .enquiry>div>span{font-size:10px!important}
    section[aria-labelledby="home-title"] .enquiryIcon{width:34px!important;height:34px!important}
   `;document.head.append(style);document.body.replaceChildren(el);window.scrollTo(0,0);
  });
  await hero.locator('.socialLogo').evaluate(i=>i.decode());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const raw=await hero.screenshot();
  // Sharp strips metadata by default. Keep recovery originals outside the shipped asset.
  const recovery=path.resolve('..','output','JovaMedia Photo Hero','source');
  await fs.mkdir(recovery,{recursive:true});await fs.writeFile(path.join(recovery,'social-preview-source.png'),raw);
  await sharp(raw).png().toFile(imagePath);
  // Cached metadata may still reference the previous static URL. Keep its origin current too.
  await fs.copyFile(imagePath,'public/share/jovamedia-homepage-2026-09.png');
  const sources={};for(const p of sourcePaths)sources[p]=sha(await fs.readFile(p));
  await fs.writeFile('public/share/social-preview-manifest.json',JSON.stringify({image:'/share/jovamedia-hero-2026-10.png',width:1200,height:630,sha256:sha(await fs.readFile(imagePath)),sources},null,2)+'\n');
  console.log('Captured current hero, 1200x630. Saved image and source-freshness manifest.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
