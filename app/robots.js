export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: ["https://www.jovamedia.com/sitemap.xml", "https://www.jovamedia.com/book/sitemap.xml"],
  };
}
