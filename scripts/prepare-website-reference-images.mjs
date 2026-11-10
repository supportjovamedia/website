// Deterministic edits explicitly requested by the user. Preserve source originals.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source='output/website-reference-originals',destination='public/jovabook/portal';
const edits={
 'evergreen-mobile':{size:[887,1774],boxes:[[558,1159,47,35]],crop:{left:91,top:0,width:705,height:1774}},
 'evergreen-desktop':{size:[1024,1536],boxes:[[296,316,30,30],[890,1118,30,28]]},
 'cobalt-mobile':{size:[724,2172],boxes:[[441,12,186,65],[420,540,40,38],[605,1499,55,52]]},
 'cobalt-desktop':{size:[1024,1536],boxes:[[486,334,36,36],[916,620,80,64],[854,1315,42,30]]},
 'terracotta-mobile':{size:[724,2172],boxes:[[400,500,46,42],[604,1240,40,38],[632,1411,45,45]]},
 'terracotta-desktop':{size:[1024,1536],boxes:[[324,376,34,34],[918,1154,36,36]]},
 'olive-mobile':{size:[724,2172],boxes:[[315,442,28,24],[598,1340,55,53]]},
 'olive-desktop':{size:[1536,1024],boxes:[[458,350,30,25],[99,753,27,25],[1380,684,58,48]]}
};
const ids={'one-page':'evergreen',brightside:'cobalt',form:'terracotta',willow:'olive'},assets={},report=[];
await mkdir(destination,{recursive:true});
for(const [id,name] of Object.entries(ids)){
 assets[id]={};
 for(const device of ['mobile','desktop']){
  const key=name+'-'+device,recipe=edits[key],original=await readFile(source+'/'+key+'.png');
  const {data,info}=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height],recipe.size,'Source dimensions changed: '+key);
  const edited=Buffer.from(data),channels=info.channels;
  // Reconstruct only the selected icon/button rectangles from clean background
  // rows directly above and below, retaining each column's local gradient.
  for(const [left,top,width,height] of recipe.boxes){
   assert(left>=0&&top>0&&left+width<=info.width&&top+height<info.height);
   for(let x=left;x<left+width;x++)for(let y=top;y<top+height;y++)for(let c=0;c<channels;c++){
    const a=data[((top-1)*info.width+x)*channels+c],b=data[((top+height)*info.width+x)*channels+c];
    edited[(y*info.width+x)*channels+c]=Math.round(a+(b-a)*(y-top+1)/(height+1));
   }
  }
  // Prove no lettering, photos or layout outside the requested rectangles moved.
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   if(recipe.boxes.some(([l,t,w,h])=>x>=l&&x<l+w&&y>=t&&y<t+h))continue;
   const i=(y*info.width+x)*channels;for(let c=0;c<channels;c++)assert.equal(edited[i+c],data[i+c]);
  }
  let image=sharp(edited,{raw:{width:info.width,height:info.height,channels}});if(recipe.crop)image=image.extract(recipe.crop);
  const png=await image.png().toBuffer();await writeFile(source+'/'+key+'-edited.png',png);
  const bytes=await sharp(png).webp({quality:95,effort:6,smartSubsample:true}).toBuffer(),hash=createHash('sha256').update(bytes).digest('hex'),meta=await sharp(bytes).metadata();
  assert(!meta.exif&&!meta.xmp&&!meta.iptc&&!/ChatGPT|OpenAI|GPT-image|C2PA/i.test(bytes.toString('latin1')));
  const file='website-'+key+'-'+hash.slice(0,12)+'.webp';await writeFile(destination+'/'+file,bytes);
  assets[id][device]={src:'/jovabook/portal/'+file,width:meta.width,height:meta.height};
  report.push({name,device,bytes:bytes.length,width:meta.width,height:meta.height,editedRectangles:recipe.boxes,crop:recipe.crop||null,unchangedOutsideEdits:true,metadata:false});
 }
}
await writeFile('app/jovabook/story/website-reference-images.mjs','// User-supplied responsive references, with requested arrow/nav/gutter edits.\nexport const websiteReferenceImages = '+JSON.stringify(assets,null,2)+';\n');
await writeFile(source+'/export-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({images:report.length,totalBytes:report.reduce((sum,x)=>sum+x.bytes,0),unchangedOutsideEdits:true,metadata:false}));
