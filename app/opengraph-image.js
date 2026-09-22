import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "JovaMedia homepage: Good ideas. Better websites. Brighter businesses.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Keep older image endpoints useful while new shares use the versioned static URL.
export default async function Image() {
  const image = await readFile(path.join(process.cwd(), "public/share/jovamedia-homepage-2026-09.png"));
  return new Response(image, { headers: { "Content-Type": contentType } });
}
