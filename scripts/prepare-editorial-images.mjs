import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const originals = path.resolve("../../output/seo/originals");
await mkdir(originals, { recursive: true });
await mkdir("public/insights", { recursive: true });
const photos = [
  { name: "lash-treatment", id: "7755531", photographer: "RDNE Stock project", page: "https://www.pexels.com/photo/a-woman-holding-a-tweezer-7755531/" },
  { name: "salon-interior", id: "7750108", photographer: "Max Vakhtbovych", page: "https://www.pexels.com/photo/photo-of-the-interior-of-a-salon-7750108/" },
];
for (const photo of photos) {
  const response = await fetch(`https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg?auto=compress&cs=tinysrgb&w=1600`);
  if (!response.ok) throw new Error(`Photo download failed: ${photo.name} (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(originals, `${photo.name}.jpg`), bytes);
  await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`public/insights/${photo.name}.webp`);
}
const qaiserSource = "public/home-selected/qaiser-watches.png";
await copyFile(qaiserSource, path.join(originals, "qaiser-website.png"));
await sharp(await readFile(qaiserSource)).extract({ left: 0, top: 0, width: 1440, height: 880 }).resize({ width: 1400 }).webp({ quality: 86 }).toFile("public/insights/qaiser-website.webp");
for (const name of ["lash-treatment", "salon-interior", "qaiser-website"]) await sharp(`public/insights/${name}.webp`).jpeg({ quality: 85 }).toFile(`public/insights/${name}-share.jpg`);
const report = {};
for (const filename of ["lash-treatment.webp", "salon-interior.webp", "qaiser-website.webp", "lash-treatment-share.jpg", "salon-interior-share.jpg", "qaiser-website-share.jpg"]) {
  const metadata = await sharp(`public/insights/${filename}`).metadata();
  const bytes = await readFile(`public/insights/${filename}`);
  report[filename] = { width: metadata.width, height: metadata.height, bytes: bytes.length, exif: Boolean(metadata.exif), xmp: Boolean(metadata.xmp), iptc: Boolean(metadata.iptc), provenanceText: /c2pa|chatgpt|openai|gpt-image/i.test(bytes.toString("latin1")) };
}
await writeFile(path.resolve("../../output/seo/editorial-image-metadata.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
