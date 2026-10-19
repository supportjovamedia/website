import { services } from "@/lib/data";
import { articles, editorialDate } from "@/lib/insights.mjs";
import { websiteTypes, websitePath } from "@/lib/website-catalogue.mjs";
export default function sitemap() {
  const base = "https://www.jovamedia.com";
  const pages = [
    "",
    "/services",
    "/websites",
    "/work",
    "/work/brand-direction",
    "/work/editorial-experience",
    "/work/qaiser-watches",
    "/insights",
    "/about",
    "/contact",
    "/get-a-quote",
    "/pricing",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...pages.map((path) => ({ url: base + path, ...(path === "/websites" ? { lastModified: "2026-10-19" } : {}) })),
    ...services.filter(service => service.slug !== "web-design").map((service) => ({ url: `${base}/services/${service.slug}` })),
    ...websiteTypes.map(item => ({ url: base + websitePath(item.slug), lastModified: "2026-10-19" })),
    ...articles.map(article => ({ url: `${base}/insights/${article.slug}`, lastModified: editorialDate })),
  ];
}
