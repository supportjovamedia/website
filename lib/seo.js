export const siteUrl = "https://www.jovamedia.com";
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
          url: "/share/jovamedia-digital-partner",
          width: 1200,
          height: 630,
          alt: "JovaMedia — Your Digital Partner. Creative digital agency, London.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/share/jovamedia-digital-partner"],
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
