import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { socialPreview } from "../lib/social-preview.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const build = path.resolve(root, process.argv[2] || process.env.JOVA_BUILD_DIR || ".next");
const publicRoot = path.join(root, "public") + path.sep;
const allowedImages = new Set([
  `public${socialPreview.url}`,
  "public/insights/lash-treatment-share.jpg",
  "public/insights/salon-interior-share.jpg",
  "public/insights/qaiser-website-share.jpg",
  "public/service-editorial/copywriting.jpg",
]);
const traces = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith(".nft.json")) traces.push(file);
  }
}
await walk(path.join(build, "server"));
assert.ok(traces.length, "No server traces found; run a production build first.");
const uniqueFiles = new Map();
const rows = [];
for (const trace of traces) {
  let bytes = 0;
  const assets = [];
  for (const relative of JSON.parse(await readFile(trace, "utf8")).files) {
    const file = path.resolve(path.dirname(trace), relative);
    const info = await stat(file);
    if (!info.isFile()) continue;
    bytes += info.size;
    uniqueFiles.set(file, info.size);
    if (file.startsWith(publicRoot)) {
      const asset = path.relative(root, file).split(path.sep).join("/");
      assets.push(asset);
      assert.ok(allowedImages.has(asset), `${path.relative(build, trace)} includes unrelated asset ${asset}`);
    }
  }
  rows.push({ trace: path.relative(build, trace), bytes, publicAssets: assets });
}
const sharingTrace = rows.find(row => row.trace.split(path.sep).join("/") === "server/app/opengraph-image/route.js.nft.json");
assert.ok(sharingTrace, "Missing homepage sharing-image trace.");
assert.ok(sharingTrace.publicAssets.includes(`public${socialPreview.url}`), "Sharing endpoint no longer includes the current image.");
console.log(JSON.stringify({
  note: "Local uncompressed traces. Files overlap between routes; this is not Vercel billed storage.",
  build: path.basename(build),
  traceCount: rows.length,
  uniqueTracedBytes: [...uniqueFiles.values()].reduce((sum, bytes) => sum + bytes, 0),
  largestTraces: rows.sort((a, b) => b.bytes - a.bytes).slice(0, 10),
}, null, 2));
