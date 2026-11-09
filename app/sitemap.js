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
    "/resources/guides",
    "/resources/tips-and-tricks",
    "/contact",
    "/get-a-quote",
    "/pricing",
    "/products/pricing",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...bookingIndustries.map(item => ({ url: `${base}/industries/${item.slug}`, lastModified: item.updatedAt || "2026-11-06" })),
    ...pages.map(path => {
      const updatedArticles = articles.map(article => articleDates(article).updatedAt).sort().at(-1);
      const modified = {
        '': '2026-11-07', '/pricing': '2026-11-07', '/privacy-policy': '2026-11-07',
        '/terms': '2026-11-06', '/about': '2026-11-08', '/services': '2026-11-08',
        '/websites': '2026-11-08', '/products': '2026-11-03',
        '/industries': '2026-11-09', '/online-booking': '2026-11-09', '/get-a-quote': '2026-11-09',
        '/blog': updatedArticles, '/resources': updatedArticles,
        '/resources/guides': updatedArticles, '/resources/tips-and-tricks': updatedArticles,
      }[path];
      return { url: base + path, ...(modified ? { lastModified: modified } : {}) };
    }),
    ...services.filter(service => service.slug !== "web-design").map((service) => ({ url: `${base}/services/${service.slug}` })),
    ...websiteTypes.map(item => ({ url: base + websitePath(item.slug), lastModified: item.updatedAt || "2026-10-19" })),
    ...articles.map(article => ({ url: `${base}/blog/${article.slug}`, lastModified: articleDates(article).updatedAt })),
    { url: `${base}/resources/google-visibility-checklist`, lastModified: '2026-11-07' },
  ];
}
