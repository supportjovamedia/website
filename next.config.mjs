import { serviceRedirects } from "./lib/service-redirects.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // An isolated output folder avoids locked OneDrive build artefacts during local QA.
  distDir: process.env.JOVA_BUILD_DIR || ".next",
  async redirects() {
    return [{ source: "/services/web-design", destination: "/websites", permanent: true }, { source: "/previews/sumera", destination: "/previews/sumera/index.html", permanent: false }, { source: "/previews/aleiman", destination: "/previews/aleiman/index.html", permanent: false }, { source: "/terms-of-service", destination: "/terms", permanent: true }, ...Object.entries(serviceRedirects).map(([source, target]) => ({ source: `/services/${source}`, destination: target === "web-design" ? "/websites" : `/services/${target}`, permanent: true }))];
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
      source: "/preview/booking/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/previews/sumera/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/previews/aleiman/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }];
  },
};
export default nextConfig;
// Service redirects include the previous System Modernization URL.
