// A small public-route manifest keeps article prose out of the analytics bundle.
export const editorialAnchors = {
  "/insights/custom-salon-booking-system-investment": ["the-booking-button-is-part-of-your-business", "what-treatwell-and-fresha-cost", "yearly-costs-for-small-medium-and-large-salons", "the-example-salons", "estimated-annual-treatwell-costs", "estimated-annual-fresha-costs", "the-yearly-comparison-at-a-glance", "when-a-subscription-can-cost-less", "a-system-you-own-permanently", "your-services-should-shape-the-software", "you-can-ask-for-the-feature-you-actually-want", "make-the-booking-experience-feel-like-your-salon", "build-a-direct-route-back-to-your-business", "ownership-gives-you-more-options-later", "a-clear-price-for-the-build-and-annual-hosting", "who-benefits-most-from-a-custom-booking-system", "build-a-booking-system-around-your-salon"],
  "/insights/salon-booking-platform-fees-vs-own-website": ["published-fees", "worked-example", "ownership", "choose-route", "before-switching", "jovamedia"],
  "/insights/small-business-website-cost-uk": ["starting-prices", "included", "what-changes", "ongoing-costs", "before-paying", "small-start"],
  "/insights/website-for-lash-technicians": ["first-visit", "photos", "booking", "local-search", "small-website", "jovamedia"],
  "/insights/salon-website-with-instagram-and-booking-app": ["missing-information", "different-jobs", "treatment-pages", "direct-discovery", "booking-fees", "first-version"],
  "/insights/does-a-small-business-need-a-website": ["the-job", "one-page", "social", "traffic", "ownership", "next-step"],
  "/insights/small-business-website-launch-checklist": ["content", "customer-journey", "mobile", "search", "handover", "after-launch"],
};
export function productionAnalyticsHost(hostname) { return hostname === "www.jovamedia.com" || hostname === "jovamedia.com"; }
