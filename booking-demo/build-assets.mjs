import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir,mkdir,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const digest=value=>createHash('sha256').update(value.replaceAll('\r\n','\n')).digest('hex');
const normalize=value=>String(value).replaceAll('\r\n','\n');
const localFile=url=>{const parsed=new URL(url,'https://bundle.local/');if(parsed.origin!=='https://bundle.local')throw Error('Only local application assets can be bundled');return parsed.pathname.slice(1);};
const scripts=/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi;
const styles=/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
const href=tag=>tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
const favicon='<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%277%27 fill=%27%23191b1d%27/%3E%3Ctext x=%279%27 y=%2724%27 font-size=%2726%27 fill=%27%23ffda00%27%3Ej%3C/text%3E%3C/svg%3E">';

// Keep classic script scope, execution order, blocking entry routing and runtime config.
// Production bundles are derived from the same source HTML used by local fixtures.
export async function bundlePage({html,readSource,page}){
 if(!['owner','operator'].includes(page))throw Error('Choose the owner or operator page');
 html=normalize(html);const entries=[...html.matchAll(scripts)].map(match=>({tag:match[0],attrs:match[1]+match[3],url:match[2],file:localFile(match[2])}));
 if(entries.some(entry=>/\basync\b|\btype\s*=/i.test(entry.attrs)))throw Error('Unexpected script execution mode');
 const config=entries.filter(entry=>entry.file==='config.js');if(config.length!==1||!/\bdefer\b/i.test(config[0].attrs))throw Error('Runtime configuration must remain one deferred script');
 const bootstrap=entries.filter(entry=>entry.file!=='config.js'&&!/\bdefer\b/i.test(entry.attrs));
 const application=entries.filter(entry=>entry.file!=='config.js'&&/\bdefer\b/i.test(entry.attrs));
 const css=[...html.matchAll(styles)].map(match=>({tag:match[0],file:localFile(href(match[0]))}));
 const assets=[];
 async function asset(kind,ext,files){
  if(!files.length)return null;const sources=[];let body='';
  for(const entry of files){const source=normalize(await readSource(entry.file));sources.push({file:entry.file,sha256:digest(source)});let transformed=source;
   if(ext==='css')transformed=source.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi,(full,quote,value)=>{const url=value.trim();if(/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url))return full;const resolved=new URL(url,'https://bundle.local/'+entry.file);return 'url("'+resolved.pathname+resolved.search+resolved.hash+'")';});
   body+='/* Source: '+entry.file+' */\n'+transformed+(ext==='js'?'\n;\n':'\n');
  }
  const sha256=digest(body),file='assets/'+page+'-'+kind+'.'+sha256.slice(0,20)+'.'+ext;const result={file,url:'/'+file,body,sha256,sources};assets.push(result);return result;
 }
 const boot=await asset('entry','js',bootstrap),app=await asset('app','js',application),sheet=await asset('styles','css',css);
 let wroteBoot=false,wroteApp=false,wroteCss=false;
 html=html.replace(scripts,(tag,_before,url)=>{
  const file=localFile(url);if(file==='config.js')return '';
  if(bootstrap.some(entry=>entry.file===file)){if(wroteBoot)return '';wroteBoot=true;return '<script src="'+boot.url+'"></script>';}
  if(wroteApp)return '';wroteApp=true;return '<script defer src="'+config[0].url+'"></script><script defer src="'+app.url+'"></script>';
 });
 html=html.replace(styles,()=>{if(wroteCss)return '';wroteCss=true;return '<link rel="stylesheet" href="'+sheet.url+'">';});
 if(!/\brel=["'](?:shortcut )?icon["']/i.test(html))html=html.replace('</head>',favicon+'\n</head>');
 return {html,assets};
}

export async function build({output=path.join(ROOT,'dist')}={}){
 const resolved=path.resolve(output);if(path.dirname(resolved)!==ROOT||path.basename(resolved)!=='dist')throw Error('Build output must be the local booking-demo/dist directory');
 // Rebuild generated output only; source and deployed asset URLs are never deleted.
 await rm(resolved,{recursive:true,force:true});await mkdir(resolved,{recursive:true});
 const allowed=/\.(?:html|css|c?js|json|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|csv|txt|webmanifest)$/i;
 async function copy(directory,relative=''){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   if(entry.name.startsWith('.')||['dist','node_modules','tests','supabase','output'].includes(entry.name))continue;
   const rel=path.posix.join(relative,entry.name),source=path.join(directory,entry.name),target=path.join(resolved,rel);
   if(entry.isDirectory()){await mkdir(target,{recursive:true});await copy(source,rel);}
   else if(entry.isFile()&&allowed.test(entry.name)&&!['package.json','package-lock.json','vercel.json'].includes(entry.name))await copyFile(source,target);
  }
 }
 await copy(ROOT);await mkdir(path.join(resolved,'assets'),{recursive:true});
 const manifest={version:1,pages:{}};
 for(const [page,document] of [['owner','index.html'],['operator','operator.html']]){
  const bundled=await bundlePage({html:await readFile(path.join(ROOT,document),'utf8'),readSource:file=>readFile(path.join(ROOT,file),'utf8'),page});
  await writeFile(path.join(resolved,document),bundled.html);
  for(const asset of bundled.assets)await writeFile(path.join(resolved,asset.file),asset.body);
  manifest.pages[page]={document,assets:bundled.assets.map(({body,...metadata})=>metadata)};
 }
 await writeFile(path.join(resolved,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const manifest=await build();console.log(JSON.stringify({pages:Object.fromEntries(Object.entries(manifest.pages).map(([page,data])=>[page,{document:data.document,bundles:data.assets.length,sourceFiles:data.assets.reduce((sum,item)=>sum+item.sources.length,0)}]))},null,2));
}
