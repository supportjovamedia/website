// A small public-route manifest keeps article prose out of the analytics bundle.
export const editorialAnchors = {
  "/insights/salon-booking-platform-fees-vs-own-website": ["published-fees", "worked-example", "ownership", "choose-route", "before-switching", "jovamedia"],
  "/insights/small-business-website-cost-uk": ["starting-prices", "included", "what-changes", "ongoing-costs", "before-paying", "small-start"],
  "/insights/website-for-lash-technicians": ["first-visit", "photos", "booking", "local-search", "small-website", "jovamedia"],
  "/insights/salon-website-with-instagram-and-booking-app": ["missing-information", "different-jobs", "treatment-pages", "direct-discovery", "booking-fees", "first-version"],
  "/insights/does-a-small-business-need-a-website": ["the-job", "one-page", "social", "traffic", "ownership", "next-step"],
  "/insights/small-business-website-launch-checklist": ["content", "customer-journey", "mobile", "search", "handover", "after-launch"],
};
export function productionAnalyticsHost(hostname) { return hostname === "www.jovamedia.com" || hostname === "jovamedia.com"; }
