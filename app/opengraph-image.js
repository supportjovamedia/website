import { readFile } from "node:fs/promises";
import path from "node:path";
import { socialPreview } from "@/lib/social-preview.mjs";

export const alt = socialPreview.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Keep older image endpoints useful while new shares use the versioned static URL.
export default async function Image() {
  // Keep the filesystem path literal. A computed public path makes the server
  // file tracer copy unrelated website images into the function bundle.
  const image = await readFile(path.join(process.cwd(), "public/share/jovamedia-hero-2026-10.png"));
  return new Response(image, { headers: { "Content-Type": contentType } });
}
