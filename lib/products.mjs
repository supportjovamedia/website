// Prices confirmed on 10 October; website package inclusions updated on 11 October 2026.
// Amounts are integer pence. Checkout always reads this server-owned catalogue.
export const CATALOG_VERSION = "2026-10-v5";
export const taxNote = "No VAT is charged.";
const websitePackageIds = ["landing-page", "business-website", "booking-system"];
// One ordered comparison also supplies the catalogue used by quote/checkout.
export const websiteComparison = [
  { heading: "Your website" },
  { label: "Website pages", values: ["One focused page", "Home, About, Services & Contact", "Home, About, Services & Contact"] },
  { label: "Content", values: ["Display a service or product", "Display services or products", "Display services or products"] },
  { label: "Responsive, mobile-friendly design", values: [true, true, true] },
  { label: "Contact form", values: [true, true, true] },
  { label: "Calls to action", values: ["One clear call to action", "Multiple calls to action", "Multiple calls to action"] },
  { label: "Search engine friendly", values: [true, true, true] },
  { label: "Custom code, no templates", values: [true, true, true] },
  { label: "Custom functionality", values: [false, true, true] },
  { label: "Terms of service & privacy policy", values: [true, true, true] },
  { label: "Full website & source code ownership", values: [true, true, true] },
  { label: "Website storage", values: ["3 GB website storage", "10 GB website storage", "25 GB website storage"] },
  { label: "Free client review before launch", values: [true, true, true] },
  { heading: "Booking system extras", bookingOnly: true },
  { label: "Your own booking admin panel", values: [false, false, true] },
  { label: "Online appointment booking", values: [false, false, true] },
  { label: "Manage bookings, services & availability", values: [false, false, true] },
  { label: "Booking confirmations", values: [false, false, true] },
  { label: "No monthly booking subscription", values: [false, false, true] },
  { label: "Free booking panel demo with you", values: [false, false, true] },
];
export function comparisonForProduct(id) {
  const column = websitePackageIds.indexOf(id);
  return column < 0 ? [] : websiteComparison.map(row => row.heading ? row : { label: row.label, value: row.values[column] });
}
function websiteInclusions(id) {
  return comparisonForProduct(id).filter(row => row.value).map(row => row.value === true ? row.label : row.value);
}
export const products = [
  {
    id: "landing-page", name: "Landing Page", category: "websites", eyebrow: "ONE PAGE",
    description: "One focused page that introduces your offer and makes it easy to enquire.",
    amount: 35000, includes: websiteInclusions("landing-page"),
    note: "For a single offer or a simple online presence.",
  },
  {
    id: "business-website", name: "Business Website", category: "websites", eyebrow: "FOUR CORE PAGES",
    description: "A straightforward website with space for your business, services and enquiries.",
    amount: 55000, includes: websiteInclusions("business-website"),
    note: "For a small business that needs a clear starting point.",
  },
  {
    id: "booking-system", name: "Website with Booking System", category: "websites", eyebrow: "WEBSITE + APPOINTMENTS",
    description: "A website with online appointment booking, built around your service business.",
    amount: 200000, includes: websiteInclusions("booking-system"),
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
