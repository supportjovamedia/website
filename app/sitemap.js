import { siteConfig } from "@/lib/data";

export default function sitemap() {
  const routes = ["", "/about", "/services", "/contact", "/privacy-policy", "/terms-of-service"];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
  }));
}
