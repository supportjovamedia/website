import { serviceRedirects } from "./lib/service-redirects.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Include the missing phone-sized step so small hero photos do not jump
    // straight from 384px to 640px on high-density mobile screens.
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // An isolated output folder avoids locked OneDrive build artefacts during local QA.
  distDir: process.env.JOVA_BUILD_DIR || ".next",
  async redirects() {
    return [{ source: "/insights", destination: "/blog", permanent: true }, { source: "/insights/:slug([a-z0-9-]+)", destination: "/blog/:slug", permanent: true }, { source: "/insights/:slug([a-z0-9-]+)/:path*", destination: "/blog/:slug/:path*", permanent: true }, { source: "/services/salon-website-design", destination: "/websites/salon-website-design", permanent: true }, { source: "/services/web-design", destination: "/websites", permanent: true }, { source: "/previews/aleiman", destination: "/previews/aleiman/index.html", permanent: false }, { source: "/terms-of-service", destination: "/terms", permanent: true }, ...Object.entries(serviceRedirects).map(([source, target]) => ({ source: `/services/${source}`, destination: target === "web-design" ? "/websites" : `/services/${target}`, permanent: true }))];
  },
  devIndicators: false,
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
      source: "/previews/aleiman/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }];
  },
};
export default nextConfig;
// Service redirects include the previous System Modernization URL.
