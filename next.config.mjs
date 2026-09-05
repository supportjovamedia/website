/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, devIndicators: false, async headers(){return process.env.VERCEL_ENV==='preview'?[{source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]:[];} };
export default nextConfig;
