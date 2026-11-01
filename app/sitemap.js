import { services } from "@/lib/data";
import { articles, articleDates } from "@/lib/insights.mjs";
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
    "/blog",
    "/about",
    "/contact",
    "/get-a-quote",
    "/pricing",
    "/jovabook",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...pages.map((path) => ({ url: base + path, ...(path === "/jovabook" ? { lastModified: "2026-11-01" } : path === "/websites" ? { lastModified: "2026-10-19" } : path === "/blog" ? { lastModified: articles.map(article => articleDates(article).updatedAt).sort().at(-1) } : {}) })),
    ...services.filter(service => service.slug !== "web-design").map((service) => ({ url: `${base}/services/${service.slug}` })),
    ...websiteTypes.map(item => ({ url: base + websitePath(item.slug), lastModified: "2026-10-19" })),
    ...articles.map(article => ({ url: `${base}/blog/${article.slug}`, lastModified: articleDates(article).updatedAt })),
  ];
}
