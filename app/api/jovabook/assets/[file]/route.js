import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const bundledAsset = /^owner-(?:entry|app|styles)\.[a-f0-9]{20}\.(?:js|css)$/;

export async function GET(_request, { params }) {
  const { file } = await params;
  if (!bundledAsset.test(file)) return new Response(null, {status: 404});

  try {
    const body = await readFile(path.join(process.cwd(), 'booking-demo/dist/assets', file));
    const stylesheet = file.endsWith('.css');
    const contents = stylesheet
      ? body.toString('utf8').replace(/url\("\/fonts\//g, 'url("https://book.jovamedia.com/fonts/')
      : body;
    return new Response(contents, {
      headers: {
        'Content-Type': stylesheet ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') return new Response(null, {status: 404});
    throw error;
  }
}
