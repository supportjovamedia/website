const site = "https://www.jovamedia.com";
export const jovabookUrl = `${site}/jovabook`;

export function jovabookMetadata() {
  const title = "Booking System for Service Businesses | JovaBook";
  const description = "JovaBook by JovaMedia is a booking system for service businesses. Manage appointments, clients and deposits. Plans from £20/month.";
  const image = {
    url: `${site}/jovabook/calendar-desktop.webp`,
    alt: "JovaBook booking calendar showing services and available working hours",
  };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: jovabookUrl },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: jovabookUrl,
      siteName: "JovaMedia",
      locale: "en_GB",
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** Facts shared with visible copy. No invented reviews or ratings. */
export function jovabookStructuredData({ faqs = [], video } = {}) {
  const applicationId = `${jovabookUrl}#software`;
  const organisation = { "@id": `${site}/#organisation` };
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${jovabookUrl}#webpage`,
      url: jovabookUrl,
      name: "JovaBook booking system for service businesses",
      description: "JovaBook by JovaMedia is scheduling and online booking software for service businesses, including hair and beauty, healthcare, education, fitness, consulting, and spa and wellness businesses.",
      inLanguage: "en-GB",
      isPartOf: { "@id": `${site}/#website` },
      publisher: organisation,
      mainEntity: { "@id": applicationId },
    },
    {
      "@type": "WebApplication",
      "@id": applicationId,
      name: "JovaBook",
      url: jovabookUrl,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Scheduling and online appointment booking software",
      operatingSystem: "Any operating system with a supported web browser",
      browserRequirements: "Requires JavaScript and an internet connection",
      inLanguage: "en-GB",
      publisher: organisation,
      description: "JovaBook is scheduling and booking software by JovaMedia for service businesses. Manage appointments, business opening hours, clients and services. Essential includes a workspace for one owner and a one-page business website.",
      featureList: [
        "Online booking page",
        "Booking calendar",
        "Client and service management",
        "Business opening hours",
        "One-page business website",
        "Email confirmations and appointment reminders",
        "Booking deposits through a connected Stripe account",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "JovaBook Essential monthly subscription",
          url: `${jovabookUrl}#essential-plan`,
          price: "20.00",
          priceCurrency: "GBP",
          seller: organisation,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "20.00",
            priceCurrency: "GBP",
            billingDuration: "P1M",
          },
          description: "£20 per month plus 1% commission on online customer bookings when appointments take place. Commission is billed monthly. Payment processing fees are separate.",
        },
        {
          "@type": "Offer",
          name: "JovaBook Essential annual subscription",
          url: `${jovabookUrl}#essential-plan`,
          price: "192.00",
          priceCurrency: "GBP",
          seller: organisation,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "192.00",
            priceCurrency: "GBP",
            billingDuration: "P1Y",
          },
          description: "£192 paid upfront for a year, equivalent to £16 per month and 20% less than twelve monthly subscriptions. A separate 1% commission on online customer bookings when appointments take place is billed monthly. Payment processing fees are separate.",
        },
      ],
    },
  ];
  for (const [name, monthly, annual, commission] of [["Standard", 50, 480, 1], ["Premium", 100, 960, 0]]) {
    for (const [cadence, price, billingDuration] of [["monthly", monthly, "P1M"], ["annual", annual, "P1Y"]]) {
      graph[1].offers.push({
        "@type": "Offer", name: `JovaBook ${name} ${cadence} subscription`,
        url: `${jovabookUrl}#plans`, price: price.toFixed(2), priceCurrency: "GBP", seller: organisation,
        priceSpecification: { "@type": "UnitPriceSpecification", price: price.toFixed(2), priceCurrency: "GBP", billingDuration },
        description: `£${price} billed ${cadence === "annual" ? "yearly, paid upfront with a 20% subscription discount" : "monthly"}. ${commission ? "1% commission on online customer bookings when appointments take place, billed monthly." : "0% booking commission."} Payment processing fees are separate.`,
      });
    }
  }
  const questions = faqs.filter(item => typeof item?.question === "string" && typeof item?.answer === "string");
  if (questions.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${jovabookUrl}#questions`,
      isPartOf: { "@id": `${jovabookUrl}#webpage` },
      mainEntity: questions.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  if (video?.duration && video?.uploadDate) {
    graph.push({
      "@type": "VideoObject",
      "@id": `${jovabookUrl}#demo-video`,
      name: "JovaBook product demonstration",
      description: "A demonstration of JovaBook's online booking and business management workspace.",
      thumbnailUrl: `${site}/jovabook/demo-poster-clean.webp`,
      contentUrl: `${site}/jovabook/demo.mp4`,
      uploadDate: video.uploadDate,
      duration: video.duration,
      inLanguage: "en-GB",
      publisher: organisation,
      isPartOf: { "@id": `${jovabookUrl}#webpage` },
    });
    graph[0].video = { "@id": `${jovabookUrl}#demo-video` };
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
