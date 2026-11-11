import businessWebsiteFactory from '../booking-demo/business-website.cjs';
import websiteDesigns from '../booking-demo/website-designs.cjs';
import schedule from '../booking-demo/scheduling-core.cjs';
import { businessSlug } from './jovabook-public-address.mjs';

const websiteOrigin = 'https://www.jovamedia.com';
const bookingOrigin = 'https://book.jovamedia.com';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const plainText = (value, limit) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, limit);
const noIndex = 'noindex, nofollow';

export function customerWebsiteUrl(slug) {
  return websiteOrigin + '/book/' + slug;
}

async function websiteRpc(name, body, { env, send }) {
  const endpoint = new URL('/rest/v1/rpc/' + name, env.JOVABOOK_SUPABASE_URL);
  if (endpoint.protocol !== 'https:' || !env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Website service is not configured.');
  }
  const response = await send(endpoint.href, {
    method: 'POST',
    headers: {
      apikey: env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Website service is unavailable.');
  return response.json();
}

const documentStyle = 'body{margin:0;font:16px/1.5 Arial,sans-serif}*{box-sizing:border-box}img{max-width:100%}a:focus-visible,summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}';

export function createCustomerWebsite({ env = process.env, send = fetch, redirectLegacy = false } = {}) {
  const renderer = businessWebsiteFactory({
    JovaWebsiteDesigns: websiteDesigns,
    JovaSchedule: schedule,
    JOVA_SUPABASE: { url: env.JOVABOOK_SUPABASE_URL },
  }).create({
    esc: escape,
    bookingLink: site => 'https://' + site.slug + '.jovamedia.com/book',
    staticNavigation: true,
  });

  return async function GET(request, { params }) {
    const { slug } = await params;
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://book.jovamedia.com; font-src https:; img-src https: data:; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': noIndex,
    };
    const error = (status, message) => new Response(
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>' + message +
      '</title><main><h1>' + message + '</h1></main></html>', { status, headers });
    if (!businessSlug(slug)) return error(404, 'Website not found');
    if (redirectLegacy) {
      const destination = new URL('/book/' + slug, request?.url || websiteOrigin);
      if (request) destination.search = new URL(request.url).search;
      return Response.redirect(destination, 308);
    }

    try {
      const site = await websiteRpc('public_customer_website', { p_slug: slug }, { env, send });
      if (!site || site.slug !== slug || !plainText(site.name, 60)) {
        return error(404, 'Website not found');
      }

      const title = plainText(site.name, 60);
      const canonical = customerWebsiteUrl(slug);
      const about = site.workspace?.website?.about ?? site.about;
      const description = plainText(about, 155) || 'View services and book an appointment with ' + title + '.';
      const markup = renderer.publicPage({ ...site, offerVersion: '2026-11-free-v1' });
      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="${bookingOrigin}/business-website.css">
<link rel="stylesheet" href="${bookingOrigin}/website-layouts.css">
<link rel="stylesheet" href="${bookingOrigin}/website-designs.css">
<style>${documentStyle}</style>
</head>
<body><main>${markup}</main></body>
</html>`;
      if (site.searchable === true && env.VERCEL_ENV !== 'preview') delete headers['X-Robots-Tag'];
      return new Response(html, { headers });
    } catch {
      return error(503, 'Website temporarily unavailable');
    }
  };
}

export function createCustomerWebsiteSitemap({ env = process.env, send = fetch } = {}) {
  return async function GET() {
    if (env.VERCEL_ENV === 'preview') {
      return new Response(null, { status: 404, headers: { 'X-Robots-Tag': noIndex } });
    }

    try {
      const slugs = await websiteRpc('customer_website_sitemap', {}, { env, send });
      if (!Array.isArray(slugs)) throw new Error('Invalid sitemap data.');
      const entries = slugs.filter(businessSlug).map(slug =>
        '<url><loc>' + customerWebsiteUrl(slug) + '</loc></url>').join('\n');
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries + '</urlset>';
      return new Response(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=300',
        },
      });
    } catch {
      return new Response('Website sitemap temporarily unavailable', { status: 503 });
    }
  };
}
