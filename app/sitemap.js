import { services } from "@/lib/data";
import { articles, articleDates } from "@/lib/insights.mjs";
import { websiteTypes, websitePath } from "@/lib/website-catalogue.mjs";
import { bookingIndustries } from "@/lib/jovabook-industries.mjs";
export default function sitemap() {
  const base = "https://www.jovamedia.com";
  const pages = [
    "",
    "/about",
    "/products",
    "/industries",
    "/online-booking",
    "/services",
    "/websites",
    "/blog",
    "/resources",
    "/contact",
    "/get-a-quote",
    "/pricing",
    "/products/pricing",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...bookingIndustries.map(item => ({ url: `${base}/industries/${item.slug}`, lastModified: "2026-11-06" })),
    ...pages.map((path) => ({ url: base + path, ...(["","/pricing","/resources","/privacy-policy"].includes(path) ? { lastModified: "2026-11-07" } : ["/terms","/about","/industries","/online-booking"].includes(path) ? { lastModified: "2026-11-06" } : path === "/products" ? { lastModified: "2026-11-03" } : path === "/websites" ? { lastModified: "2026-10-19" } : path === "/blog" ? { lastModified: articles.map(article => articleDates(article).updatedAt).sort().at(-1) } : {}) })),
    ...services.filter(service => service.slug !== "web-design").map((service) => ({ url: `${base}/services/${service.slug}` })),
    ...websiteTypes.map(item => ({ url: base + websitePath(item.slug), lastModified: "2026-10-19" })),
    ...articles.map(article => ({ url: `${base}/blog/${article.slug}`, lastModified: articleDates(article).updatedAt })),
    { url: `${base}/resources/google-visibility-checklist`, lastModified: '2026-11-07' },
  ];
}
