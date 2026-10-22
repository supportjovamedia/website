// A small public-route manifest keeps article prose out of the analytics bundle.
export const editorialAnchors = {
  "/insights/php2shell-website-shutdowns": ["the-security-fix-sits-beneath-the-website", "a-shutdown-does-not-tell-the-whole-story", "the-warning-sign-is-an-upgrade-nobody-wants-to-attempt", "fix-the-immediate-exposure-then-remove-the-upgrade-blockers", "make-the-next-change-easier-to-release", "give-your-ageing-website-a-workable-next-step", "sources"],
  "/insights/ai-php-security-emergency": ["ai-helped-find-the-problem-people-had-to-deliver-the-fix", "the-bottleneck-can-be-the-system-you-already-own", "an-ai-report-is-the-start-of-an-investigation", "prepare-before-the-urgent-email-arrives", "modernisation-can-also-make-everyday-work-better", "find-out-what-would-slow-your-business-down", "sources"],
  "/insights/php-wordpress-booking-website-security": ["follow-the-appointment-all-the-way-into-the-diary", "separate-a-booking-problem-from-a-platform-problem", "the-php-emergency-makes-maintenance-part-of-the-decision", "build-around-the-appointments-you-actually-sell", "ownership-gives-you-decisions-to-make-for-your-own-business", "bring-us-the-booking-problem-your-team-keeps-working-around", "sources"],

  "/insights/custom-salon-booking-system-investment": ["the-booking-button-is-part-of-your-business", "what-treatwell-and-fresha-cost", "yearly-costs-for-small-medium-and-large-salons", "the-example-salons", "estimated-annual-treatwell-costs", "estimated-annual-fresha-costs", "the-yearly-comparison-at-a-glance", "when-a-subscription-can-cost-less", "a-system-you-own-permanently", "your-services-should-shape-the-software", "you-can-ask-for-the-feature-you-actually-want", "make-the-booking-experience-feel-like-your-salon", "build-a-direct-route-back-to-your-business", "ownership-gives-you-more-options-later", "a-clear-price-for-the-build-and-annual-hosting", "who-benefits-most-from-a-custom-booking-system", "build-a-booking-system-around-your-salon"],
  "/insights/salon-booking-platform-fees-vs-own-website": ["published-fees", "worked-example", "ownership", "choose-route", "before-switching", "jovamedia"],
  "/insights/small-business-website-cost-uk": ["starting-prices", "included", "what-changes", "ongoing-costs", "before-paying", "small-start"],
  "/insights/website-for-lash-technicians": ["first-visit", "photos", "booking", "local-search", "small-website", "jovamedia"],
  "/insights/salon-website-with-instagram-and-booking-app": ["missing-information", "different-jobs", "treatment-pages", "direct-discovery", "booking-fees", "first-version"],
  "/insights/does-a-small-business-need-a-website": ["the-job", "one-page", "social", "traffic", "ownership", "next-step"],
  "/insights/small-business-website-launch-checklist": ["content", "customer-journey", "mobile", "search", "handover", "after-launch"],
};
export function productionAnalyticsHost(hostname) { return hostname === "www.jovamedia.com" || hostname === "jovamedia.com"; }
