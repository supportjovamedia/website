import {readFile,writeFile,mkdir,copyFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import {portalScreens} from '../app/jovabook/story/portal-screens.mjs';
const root=new URL('../',import.meta.url);
const local=new URL('public/__jovabook-share-local.html',root);
const recovery=new URL('../../JovaBook Portal Screenshots/2026-11-10/Share/',root);
const sources=['app/navigation.css','app/jovabook/story/OriginalSections.js','app/jovabook/story/story.css','app/jovabook/story/rhythm.css','app/jovabook/story/polish.css','app/button-colours.css','app/jovabook/story/portal-screens.mjs','app/jovabook/search-data.mjs','scripts/capture-jovabook-share.mjs','public/brand/jova-logo.png','public'+portalScreens['hero.macbook'].url,'public'+portalScreens['hero.iphone'].url,'app/fonts/plus-jakarta-sans.woff2'];
const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(recovery,{recursive:true});
if(process.argv[2]==='prepare'){
 const font=(await readFile(new URL('app/fonts/plus-jakarta-sans.woff2',root))).toString('base64');
 await writeFile(local,`<!doctype html><html lang="en"><meta charset="utf-8"><title>JovaBook share preview</title><style>
 @font-face{font-family:Jakarta;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:200 800}*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{background:#f7f7f7;color:#111;font-family:Jakarta,Arial,sans-serif}.brand{position:absolute;left:54px;top:42px;display:flex;align-items:center;gap:18px}.brand img{width:139px;height:auto}.brand span{font-size:19px;border-left:1px solid #c9d0cc;padding-left:18px;font-weight:600}.copy{position:absolute;left:54px;top:160px;width:445px}h1{font-size:46px;line-height:1.09;letter-spacing:-2.5px;font-weight:650;margin:0 0 27px}p{font-size:20px;line-height:1.6;color:#333;margin:0;max-width:405px}.free{display:inline-flex;align-items:center;gap:13px;margin-top:37px;border-radius:40px;background:#111;color:white;font-size:16px;font-weight:650;padding:17px 24px}.free span{font-size:14px;font-weight:500;color:#ffd700}.scene{position:absolute;left:520px;top:106px;width:650px;height:500px}.calendar{position:absolute;left:0;top:32px;width:610px;height:397px;border:7px solid #262b2e;border-radius:12px;overflow:hidden;background:white;box-shadow:0 21px 46px -20px #12365350}.calendar img{width:100%;height:auto;display:block}.phone{position:absolute;left:461px;top:101px;width:156px;height:328px;overflow:hidden;border:5px solid #262b2e;border-radius:17px;box-shadow:0 15px 30px #12365330;background:white}.phone img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
 </style><div class="brand"><img src="/brand/jova-logo.png" alt="JovaMedia"><span>JovaBook</span></div><main class="copy"><h1>Online booking system<br>for small businesses.</h1><p>Manage your diary, clients and team in one place. Your website is included.</p><div class="free">Start free <span>0% booking commission</span></div></main><div class="scene"><div class="calendar"><img src="${portalScreens['hero.macbook'].url}" alt="JovaBook dashboard"></div><div class="phone"><img src="${portalScreens['hero.iphone'].url}" alt="JovaBook mobile calendar"></div></div></html>`);
 console.log('Open http://127.0.0.1:3000/__jovabook-share-local.html at 1200x630 using the supported browser. Save the screenshot, then pass its absolute path to this script. No live requests are used.');
}else{
 const input=process.argv[2];if(!input||!path.isAbsolute(input))throw Error('Pass prepare, or an absolute path to the current local 1200x630 share screenshot.');
 const image=await sharp(input).metadata();if(image.width!==1200||image.height!==630)throw Error('Capture exactly 1200x630; do not crop a different page.');
 await copyFile(input,new URL('share-source-original'+path.extname(input),recovery));
 const bytes=await sharp(input).png({compressionLevel:9}).toBuffer();
 const url='/share/jovabook-hero-'+sha(bytes).slice(0,12)+'.png';
 await writeFile(new URL('public'+url,root),bytes);
 const alt='JovaBook by JovaMedia: an online booking system for small businesses, showing the actual dashboard and mobile calendar.';
 await writeFile(new URL('lib/social-preview.mjs',root),'export const socialPreview = '+JSON.stringify({url,width:1200,height:630,alt},null,2)+';\n');
 const route=new URL('app/opengraph-image.js',root);await writeFile(route,(await readFile(route,'utf8')).replace(/public\/share\/[^"']+\.png/,'public'+url));
 const hashes={};for(const file of sources){const data=await readFile(new URL(file,root));hashes[file]=sha(/\.(png|webp|woff2)$/.test(file)?data:data.toString('utf8').replace(/\r\n/g,'\n'));}
 await writeFile(new URL('public/share/social-preview-manifest.json',root),JSON.stringify({image:url,width:1200,height:630,sha256:sha(bytes),sources:hashes},null,2)+'\n');
 await unlink(local).catch(e=>{if(e.code!=='ENOENT')throw e});
 const metadata=await sharp(bytes).metadata();console.log(JSON.stringify({url,bytes:bytes.length,width:metadata.width,height:metadata.height,exif:Boolean(metadata.exif),xmp:Boolean(metadata.xmp),provenanceMarker:/ChatGPT|OpenAI|GPT-image|C2PA/.test(bytes.toString('latin1'))}));
}
