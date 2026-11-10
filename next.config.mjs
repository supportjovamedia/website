import { serviceRedirects } from "./lib/service-redirects.mjs";
import { businessHostRewrites } from "./lib/jovabook-public-address.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Include the missing phone-sized step so small hero photos do not jump
    // straight from 384px to 640px on high-density mobile screens.
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
    // Optimised images are reused for 31 days instead of being rebuilt/revalidated.
    minimumCacheTTL: 2678400,
  },
  // An isolated output folder avoids locked OneDrive build artefacts during local QA.
  distDir: process.env.JOVA_BUILD_DIR || ".next",
  async redirects() {
    return [{ source: "/insights", destination: "/blog", permanent: true }, { source: "/jovabook", destination: "/", permanent: true }, { source: "/work", destination: "/", permanent: true }, { source: "/work/qaiser-watches", destination: "/websites#website-work", permanent: true }, { source: "/work/:path*", destination: "/", permanent: true }, { source: "/share/jovamedia-2026", destination: "/", permanent: true }, { source: "/share/jovamedia-digital-partner", destination: "/", permanent: true }, { source: "/insights/:slug([a-z0-9-]+)", destination: "/blog/:slug", permanent: true }, { source: "/insights/:slug([a-z0-9-]+)/:path*", destination: "/blog/:slug/:path*", permanent: true }, { source: "/services/salon-website-design", destination: "/websites/salon-website-design", permanent: true }, { source: "/services/web-design", destination: "/websites", permanent: true }, { source: "/previews/aleiman", destination: "/previews/aleiman/index.html", permanent: false }, { source: "/terms-of-service", destination: "/terms", permanent: true }, ...Object.entries(serviceRedirects).map(([source, target]) => ({ source: `/services/${source}`, destination: target === "web-design" ? "/websites" : `/services/${target}`, permanent: true }))];
  },
  devIndicators: false,
  async rewrites() {
    return {beforeFiles: businessHostRewrites(), afterFiles: [], fallback: []};
  },
  async headers() {
    const previewHeaders = process.env.VERCEL_ENV === "preview"
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ]
      : [];
    return [...previewHeaders, {
      // Public images, fonts and video change rarely: let browsers and the CDN reuse them
      // instead of re-requesting every file on every visit (Vercel's default is max-age=0).
      source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2|woff|mp4|webm)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    }, {
      // Demo media uses content hashes, so updated videos get fresh URLs.
      source: "/jovabook/demo-:hash.mp4",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      source: "/jovabook/demo-poster-:hash.webp",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      // These filenames contain a content hash. Changed artwork gets a new URL.
      source: "/jovabook/industries/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      // Portal screenshot filenames contain their content hash.
      source: "/jovabook/portal/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      // Versioned social artwork is immutable, just like the portal screenshots.
      source: "/share/jovabook-hero-:hash.png",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      source: "/jovabook/portal/manifest.json",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    }, {
      source: "/previews/aleiman/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }];
  },
};
export default async function configuration(phase){
  if(phase==='phase-production-build'){
    const {verifyJovaBookRelease}=await import('./lib/jovabook-release.mjs');
    await verifyJovaBookRelease();
  }
  return nextConfig;
}
// Service redirects include the previous System Modernization URL.

