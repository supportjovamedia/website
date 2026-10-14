import sharp from "sharp";
import { stat, mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory="public/hero-daybreak";
const originals=path.resolve("../../output/seo/originals/hero");
await mkdir(originals,{recursive:true});
const report=[];
for(const [name,extension,width,quality] of [["coffee-cup","png",1141,89],["leaves","png",1000,88],["beans","png",230,88],["coffee-glass","jpg",700,86],["croissant","jpg",600,86]]){
  const source=`${directory}/${name}.${extension}`,destination=`${directory}/${name}.webp`;
  await copyFile(source,path.join(originals,`${name}.${extension}`));
  await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,effort:6}).toFile(destination);
  report.push({source,destination,before:(await stat(source)).size,after:(await stat(destination)).size});
}
await writeFile(path.resolve("../../output/seo/hero-image-sizes.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
