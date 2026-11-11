import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {bundlePage} from '../booking-demo/build-assets.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const RELEASE_TARGETS=Object.freeze({
 teamId:'team_NcSiOynepf1jMw4CtMIkJTzW',
 booking:{host:'book.jovamedia.com',projectId:'prj_1fXIQetCNNmCNRxL3Tz6wYQibmLT'},
 main:{host:'www.jovamedia.com',projectId:'prj_SMgNZdv77o7zdKf3Fb7Yv7MVAyvE'}
});
const CRITICAL_ASSETS=Object.freeze([
 'config.js','accounts.js','google-auth.js','app.js','public-links.js','public-entry.js',
 'business-website.cjs','business-locale.js','workspace.js',
 'workspace-polish.css','mobile-navigation.js','mobile-navigation.css','calendar-workspace.js',
 'calendar-polish.css','dashboard-date-picker.js','date-picker-polish.css','booking-filters.js',
 'booking-filters.css','booking-list-polish.css','dirty-forms.js','dirty-forms.css',
 'booking-content.js','booking-content.css','owner-onboarding.js','owner-onboarding.css','owner-welcome.js','refunds.js','owner-funnel.js','sms-reminders.js'
]);
const OPERATOR_ASSETS=Object.freeze(['operator.js','operator.css','operator-signup-flow.js','operator-signup-flow.css','operator-polish.css']);
const normalized=value=>String(value).replaceAll('\r\n','\n');
const hash=value=>createHash('sha256').update(normalized(value)).digest('hex');
const sourceFile=(commit,file)=>execFileSync('git',['show',`${commit}:booking-demo/${file}`],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});
const safeError=error=>error?.name==='TimeoutError'||error?.name==='AbortError'?'Request timed out.':'Request could not be verified.';

// All network operations are GETs. No session, credential, domain or deployment is changed.
// The injectable transport and source reader let tests use an isolated local HTTP server.
export async function verifyJovaBookRelease({expectedCommit,vercelToken=process.env.VERCEL_TOKEN,fetcher=fetch,readSource=sourceFile}={}){
 if(!/^[a-f0-9]{40}$/i.test(expectedCommit||''))throw Error('Provide the full approved 40-character commit with --commit. No release was verified.');
 if(typeof vercelToken!=='string'||!vercelToken.trim())throw Error('VERCEL_TOKEN must be supplied securely through the environment for read-only deployment checks. No release was verified.');
 const commit=expectedCommit.toLowerCase(),checks=[],add=(name,ok,details={})=>checks.push({name,ok,...details});
 let html;
 try{html=await readSource(commit,'index.html');}catch{throw Error('The expected commit or its booking-demo/index.html is not available in this checkout. No release was verified.');}
 const jobs=[],pages={};
 try{const approved=await readSource(commit,'build-assets.mjs'),local=await readFile(new URL('../booking-demo/build-assets.mjs',import.meta.url),'utf8');add('source:build-assets.mjs',hash(approved)===hash(local),{reason:hash(approved)===hash(local)?undefined:'The verifier bundler differs from the approved commit. Check out the approved release before verification.'});}
 catch{add('source:build-assets.mjs',false,{reason:'Approved bundle builder source is unavailable.'});}
 for(const [page,document,required] of [['owner','index.html',CRITICAL_ASSETS],['operator','operator.html',OPERATOR_ASSETS]]){
  try{
   const sourceHtml=page==='owner'?html:await readSource(commit,document),result=await bundlePage({html:sourceHtml,page,readSource:file=>readSource(commit,file)});
   if(typeof result.html!=='string'||!Array.isArray(result.assets)||!result.assets.length)throw Error('Invalid bundle result');
   const included=new Set(result.assets.flatMap(asset=>asset.sources.map(source=>source.file)));
   for(const file of required)if(file!=='config.js'&&!included.has(file))add('source:'+file,false,{reason:'Critical source is missing from generated bundles.'});
   pages[page]={document,assets:result.assets};
   jobs.push({file:document,url:page==='owner'?'/?portal=owner':'/operator.html',expected:result.html});
   for(const asset of result.assets)jobs.push({file:asset.file,url:asset.url,expected:asset.body});
  }catch{add('source:'+document,false,{reason:'The approved page and all bundle sources must be available and build successfully.'});}
 }
 const manifest={version:1,pages:Object.fromEntries(Object.entries(pages).map(([page,{document,assets}])=>[page,{document,assets:assets.map(({body,...metadata})=>metadata)}]))};
 jobs.push({file:'asset-manifest.json',url:'/asset-manifest.json',expected:JSON.stringify(manifest,null,2)+'\n'});
 try{jobs.push({file:'config.js',url:'/config.js',expected:await readSource(commit,'config.js')});}catch{add('source:config.js',false,{reason:'Public configuration source is missing from the approved commit.'});}
 try{
  const google=await readSource(commit,'google-auth.js'),sdk=google.match(/script\.src\s*=\s*['"]([^'"]+\/supabase-[^'"]+\.js)['"]/);
  if(!sdk||!/^\/vendor\/[a-z0-9._-]+\.js$/i.test(sdk[1]))add('source:google-sdk',false,{reason:'The self-hosted Google authentication SDK path could not be verified.'});
  else jobs.push({file:sdk[1].slice(1),url:sdk[1],expected:await readSource(commit,sdk[1].slice(1))});
 }catch{add('source:google-sdk',false,{reason:'Google authentication SDK source is missing from the expected commit.'});}
 const get=(url,headers={})=>fetcher(url,{method:'GET',headers:{'Cache-Control':'no-cache',...headers},redirect:'error',signal:AbortSignal.timeout(15000)});
 await Promise.all(Object.entries(RELEASE_TARGETS).filter(([,target])=>target?.host).map(async([name,target])=>{
  try{
   const url=new URL('https://api.vercel.com/v13/deployments/'+encodeURIComponent(target.host));url.searchParams.set('teamId',RELEASE_TARGETS.teamId);url.searchParams.set('withGitRepoInfo','true');
   const response=await get(url.href,{Authorization:'Bearer '+vercelToken});
   if(!response.ok){add('deployment:'+name,false,{reason:'Vercel metadata HTTP '+response.status});return;}
   const raw=await response.json(),deployment=raw?.deployment||raw?.result?.deployment||raw;
   const actualCommit=deployment.meta?.githubCommitSha||deployment.gitSource?.sha||null,projectId=deployment.project?.id||deployment.projectId||null,state=deployment.readyState||deployment.state;
   const aliases=Array.isArray(deployment.alias)?deployment.alias.map(alias=>typeof alias==='string'?alias:alias?.alias):[];
   const ok=projectId===target.projectId&&actualCommit===commit&&state==='READY'&&deployment.target==='production'&&aliases.includes(target.host)&&typeof deployment.id==='string';
   add('deployment:'+name,ok,{host:target.host,projectId,deploymentId:deployment.id||null,expectedCommit:commit,actualCommit,state:state||null,productionAliasConfirmed:aliases.includes(target.host),reason:ok?undefined:'Live production alias, project, READY state and source commit must all match.'});
  }catch(error){add('deployment:'+name,false,{reason:safeError(error)});}
 }));
 let index=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(index<jobs.length){const job=jobs[index++];
   try{
    const response=await get('https://'+RELEASE_TARGETS.booking.host+job.url);
    if(!response.ok){add('asset:'+job.file,false,{status:response.status,reason:'Critical release asset is unavailable.'});continue;}
    const type=response.headers.get('content-type')||'',wanted=job.file.endsWith('.html')?/text\/html/i:job.file.endsWith('.json')?/application\/json/i:job.file.endsWith('.css')?/text\/css/i:/(?:application|text)\/(?:java|ecma)script/i;
    if(!wanted.test(type)){add('asset:'+job.file,false,{reason:'Unexpected content type.',contentType:type});continue;}
    if(/^assets\/(?:owner|operator)-(?:entry|app|styles)\./.test(job.file)||/^vendor\/supabase-[\d.]+\.js$/.test(job.file)){
     const cacheControl=response.headers.get('cache-control')||'';
     add('cache:'+job.file,/\bmax-age=31536000\b/i.test(cacheControl)&&/\bimmutable\b/i.test(cacheControl),{cacheControl,reason:'Content-hashed bundles must keep the approved one-year immutable browser cache.'});
    }
    const body=await response.text(),expectedHash=hash(job.expected),actualHash=hash(body);
    add('asset:'+job.file,expectedHash===actualHash,{expectedHash,actualHash,reason:expectedHash===actualHash?undefined:'Live bytes differ from the approved commit.'});
   }catch(error){add('asset:'+job.file,false,{reason:safeError(error)});}
  }
 }));
 return {ok:checks.length>0&&checks.every(check=>check.ok),expectedCommit:commit,checkedAt:new Date().toISOString(),checks};
}

async function cli(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--commit'){console.error('Usage: node scripts/verify-jovabook-release.mjs --commit <approved-full-commit-sha>');process.exitCode=1;return;}
 try{const report=await verifyJovaBookRelease({expectedCommit:args[1]});console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;}
 catch(error){console.error(error.message);process.exitCode=1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await cli();
