import { serviceRedirects } from "./lib/service-redirects.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/terms-of-service", destination: "/terms", permanent: true }, ...Object.entries(serviceRedirects).map(([source, target]) => ({ source: `/services/${source}`, destination: `/services/${target}`, permanent: true }))];
  },
  devIndicators: false,
  async headers() {
    return process.env.VERCEL_ENV === "preview"
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ]
      : [];
  },
};
export default nextConfig;
// Service redirects include the previous System Modernization URL.
