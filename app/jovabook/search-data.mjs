import {OFFER_PLANS} from "../../lib/jovabook-offer.mjs";
const site = "https://www.jovamedia.com";
export const jovabookUrl = `${site}/`;

export function jovabookMetadata() {
  const title = "Booking System for Service Businesses | JovaBook";
  const description = "JovaBook by JovaMedia is a booking system for service businesses. Start free with 20 monthly bookings and a one-page website. Add Stripe deposits on paid plans. 0% booking commission on every plan.";
  const image = {
    url: `${site}/share/jovabook-free-plans-2026-11.png`,
    width: 1200,
    height: 630,
    alt: "JovaBook booking system for service businesses, with a calendar, mobile booking page and yellow accent",
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
      description: "JovaBook is scheduling and booking software by JovaMedia for service businesses. Manage appointments, business opening hours, clients and services. The Free plan is free for one staff calendar and 20 bookings per month, including a one-page business website. Every plan has 0% booking commission.",
      featureList: [
        "Online booking page",
        "Booking calendar",
        "Client and service management",
        "Business opening hours",
        "One-page business website",
        "Email confirmations and appointment reminders",
        "Booking deposits through a connected Stripe account",
      ],
      offers: Object.entries(OFFER_PLANS).flatMap(([id,plan])=>(id==='essential'?['monthly']:['monthly','annual']).map(cadence=>({
        "@type":"Offer",name:'JovaBook '+plan.name+' '+cadence,url:jovabookUrl+'#plans',price:((cadence==='annual'?plan.annual:plan.amount)/100).toFixed(2),priceCurrency:'GBP',seller:organisation,
        priceSpecification:{"@type":"UnitPriceSpecification",price:((cadence==='annual'?plan.annual:plan.amount)/100).toFixed(2),priceCurrency:'GBP',billingDuration:cadence==='annual'?'P1Y':'P1M'},
        description:(id==='essential'?'Free plan. One staff calendar, 20 monthly bookings and 50 monthly emails.':id==='standard'?'One staff calendar, unlimited bookings, 100 emails and 60 SMS per month.':'One staff seat included. Additional seats cost '+(cadence==='annual'?'£57.60/year':'£6/month')+' each, with 100 emails and 60 SMS per seat per month.')+' 0% booking commission. Stripe processing fees are separate.'
      }))),
    },
  ];
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
