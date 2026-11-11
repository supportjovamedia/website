import { publicApp } from '../public-app.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request, context) {
  const query = new URL(request.url).searchParams;
  if (query.has('view') || query.has('salon') || query.has('demo')) {
    return new Response('Page not found', {status: 404, headers: {'X-Robots-Tag': 'noindex, nofollow'}});
  }
  return publicApp(request, context);
}
