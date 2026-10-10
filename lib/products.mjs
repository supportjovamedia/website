// Prices confirmed by the business on 10 October 2026.
// Amounts are integer pence. Checkout always reads this server-owned catalogue.
export const CATALOG_VERSION = "2026-10-v1";
export const taxNote = "VAT treatment will be confirmed in your quote before you order.";
export const products = [
  {
    id: "landing-page", name: "Starter", eyebrow: "LANDING PAGE",
    description: "One focused page that introduces your offer and makes it easy to enquire.",
    amount: 35000, includes: ["One responsive page", "Your services, proof and contact section", "Enquiry form", "Basic page titles and descriptions"],
    note: "For a single offer or a simple online presence.",
  },
  {
    id: "business-website", name: "Power", eyebrow: "BUSINESS WEBSITE",
    description: "A straightforward website with space for your business, services and enquiries.",
    amount: 55000, includes: ["Home, services and contact pages", "Responsive design", "Enquiry form", "Basic page titles and descriptions"],
    note: "For a small business that needs a clear starting point.",
  },
  {
    id: "booking-system", name: "Pro", eyebrow: "BOOKING WEBSITE",
    description: "A website with online appointment booking, built around your service business.",
    amount: 200000, includes: ["Business website", "Service and availability setup", "Online appointment booking", "Booking confirmations"],
    note: "We confirm your scheduling requirements before work begins.",
  },
];
export function productById(id) { return products.find(product => product.id === id); }
export function formatPrice(amount) {
  return Number.isSafeInteger(amount) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100) : "Price to confirm";
}
export function validBasket(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= products.length && new Set(value).size === value.length && value.every(id => typeof id === "string" && productById(id));
}
export function basketItems(value) { return validBasket(value) ? value.map(productById) : []; }
export function basketTotal(items) { return items.length && items.every(item => Number.isSafeInteger(item.amount) && item.amount > 0) ? items.reduce((sum, item) => sum + item.amount, 0) : null; }
