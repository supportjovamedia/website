export const siteUrl = "https://jovamedia.com";
export function pageMetadata(path, title, description) {
  const fullTitle = title.includes("JovaMedia")
    ? title
    : `${title} | JovaMedia`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: siteUrl + path,
      siteName: "JovaMedia",
      locale: "en_GB",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "JovaMedia — Brands grow with purpose.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
export function serviceSchema(service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteUrl}/services/${service.slug}#service`,
    name: service.name,
    description: service.desc,
    serviceType: service.name,
    url: `${siteUrl}/services/${service.slug}`,
    provider: { "@id": `${siteUrl}/#organisation` },
  };
}
