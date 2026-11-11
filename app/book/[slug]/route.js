import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBookingEmbed } from '@/lib/jovabook-embed.mjs';
import { createCustomerWebsite } from '@/lib/jovabook-customer-website.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const website = createCustomerWebsite();
const publicApp = createBookingEmbed({
  standalone: true,
  canonical: true,
  readShell: () => readFile(path.join(process.cwd(), 'booking-demo/dist/index.html'), 'utf8'),
});

export function GET(request, context) {
  const query = new URL(request.url).searchParams;
  const views = query.getAll('view');
  if (!views.length) return website(request, context);
  if (views.length === 1 && ['booking', 'account'].includes(views[0]) && !query.has('salon') && !query.has('demo')) {
    return publicApp(request, context);
  }
  return new Response('Page not found', {status: 404, headers: {'X-Robots-Tag': 'noindex, nofollow'}});
}
