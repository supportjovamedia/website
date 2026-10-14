import { services } from "@/lib/data";
import { articles, editorialDate } from "@/lib/insights.mjs";
export default function sitemap() {
  const base = "https://www.jovamedia.com";
  const pages = [
    "",
    "/services",
    "/work",
    "/work/brand-direction",
    "/work/editorial-experience",
    "/work/qaiser-watches",
    "/services/salon-website-design",
    "/insights",
    "/about",
    "/contact",
    "/get-a-quote",
    "/pricing",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...pages.map((path) => ({ url: base + path })),
    ...services.map((service) => ({ url: `${base}/services/${service.slug}` })),
    ...articles.map(article => ({ url: `${base}/insights/${article.slug}`, lastModified: editorialDate })),
  ];
}
