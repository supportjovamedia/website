import { serviceRedirects } from "./lib/service-redirects.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/previews/sumera", destination: "/previews/sumera/index.html", permanent: false }, { source: "/previews/aleiman", destination: "/previews/aleiman/index.html", permanent: false }, { source: "/terms-of-service", destination: "/terms", permanent: true }, ...Object.entries(serviceRedirects).map(([source, target]) => ({ source: `/services/${source}`, destination: `/services/${target}`, permanent: true }))];
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
