import { readFile } from "node:fs/promises";
import path from "node:path";
import { socialPreview } from "@/lib/social-preview.mjs";

export const alt = socialPreview.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Keep older image endpoints useful while new shares use the versioned static URL.
export default async function Image() {
  const image = await readFile(path.join(process.cwd(), "public", socialPreview.url.slice(1)));
  return new Response(image, { headers: { "Content-Type": contentType } });
}
