// Prices confirmed on 10 October; website package inclusions updated on 11 October 2026.
// Amounts are integer pence. Checkout always reads this server-owned catalogue.
export const CATALOG_VERSION = "2026-10-v3";
export const taxNote = "No VAT is charged.";
const websiteInclusions = [
  "Search engine friendly",
  "Custom code, no templates",
  "Custom functionality",
  "Terms of service & privacy policy",
  "Full website & source code ownership",
];
export const products = [
  {
    id: "landing-page", name: "Landing Page", category: "websites", eyebrow: "ONE PAGE",
    description: "One focused page that introduces your offer and makes it easy to enquire.",
    amount: 35000, includes: ["One responsive page", "Services, proof and contact sections", "Enquiry form", "One clear call to action", ...websiteInclusions, "3 GB website storage"],
    note: "For a single offer or a simple online presence.",
  },
  {
    id: "business-website", name: "Business Website", category: "websites", eyebrow: "FOUR CORE PAGES",
    description: "A straightforward website with space for your business, services and enquiries.",
    amount: 55000, includes: ["Home, About, Services and Contact pages", "Responsive design & enquiry form", "Display services or products", "Multiple calls to action", ...websiteInclusions, "10 GB website storage", "Free client review before launch"],
    note: "For a small business that needs a clear starting point.",
  },
  {
    id: "booking-system", name: "Website with Booking System", category: "websites", eyebrow: "WEBSITE + APPOINTMENTS",
    description: "A website with online appointment booking, built around your service business.",
    amount: 200000, includes: ["Business website included", "Online appointment booking", "Your own self-service admin panel", "Manage bookings, services & availability", "Booking confirmations", "No monthly booking subscription", ...websiteInclusions, "25 GB website storage", "Free client review before launch"],
    note: "Ideal for salons, lash technicians, chiropractors and appointment-based businesses. Scheduling requirements are agreed before work begins.",
  },
  {
    id: "web-care", name: "Web Care", category: "subscriptions", interval: "month", eyebrow: "MONTHLY WEBSITE CARE",
    description: "Routine care for one website, with a small allowance for minor content updates.",
    amount: 3900, includes: ["Monthly website health check", "Compatible updates and backups, where supported", "Up to 15 minutes of minor text or image changes each month", "Email support"],
    note: "Unused edit time does not roll over. New pages, redesigns, new features, emergency recovery and third-party fees are quoted separately. Hosting is not included.",
  },
  {
    id: "web-care-pro", name: "Web Care Pro", category: "subscriptions", interval: "month", eyebrow: "MONTHLY WEBSITE CARE",
    description: "The same routine care, with a little more time for updates and a monthly performance review.",
    amount: 9900, includes: ["Monthly health check and performance review", "Compatible updates and backups, where supported", "Up to 45 minutes of minor text or image changes each month", "Priority email support during business hours"],
    note: "Unused edit time does not roll over. New pages, redesigns, new features, emergency recovery and third-party fees are quoted separately. Hosting is not included.",
  },
];
export const productCategories = [{ id: "websites", name: "Websites", description: "Choose the website that fits your business." }, { id: "subscriptions", name: "Web Care", description: "Monthly care for your existing website. Choose one plan per website." }];
export function productById(id) { return products.find(product => product.id === id); }
export function formatPrice(amount) {
  return Number.isSafeInteger(amount) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100) : "Price to confirm";
}
export function validBasket(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= products.length && new Set(value).size === value.length && value.every(id => typeof id === "string" && productById(id)) && value.filter(id => productById(id).interval).length <= 1;
}
export function basketItems(value) { return validBasket(value) ? value.map(productById) : []; }
export function basketTotal(items) { return items.length && items.every(item => Number.isSafeInteger(item.amount) && item.amount > 0) ? items.reduce((sum, item) => sum + item.amount, 0) : null; }
