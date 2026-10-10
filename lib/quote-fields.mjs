import { products } from "./products.mjs";
import { serviceOptions } from "./enquiry-fields.mjs";

export const quoteProducts = products.map(product => ({ value: product.id, label: product.name }));
export const quoteServices = serviceOptions.map((label, index) => ({ value: `service-${index}`, label }));
export const quoteOptions = [...quoteServices, { value: "not-sure", label: "I’m not sure yet" }];

export function validateQuote(data) {
  const values = {};
  const errors = {};
  for (const [key, max] of Object.entries({ name: 100, email: 200, phone: 40, service: 100 })) {
    const raw = data[key] ?? "";
    values[key] = typeof raw === "string" ? raw.trim() : "";
    if (typeof raw !== "string" || raw.length > max || /[\r\n]/.test(values[key])) errors[key] = `Please enter no more than ${max} characters on one line.`;
  }
  if (!values.name) errors.name = "Please enter your name.";
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email)) errors.email = "Please enter a valid email address.";
  const digits = values.phone.replace(/\D/g, "");
  if (values.phone && (!/^[+()\d .-]+$/.test(values.phone) || digits.length < 7 || digits.length > 15)) errors.phone = "Please enter a valid phone number or leave it blank.";
  if (!quoteOptions.some(option => option.value === values.service)) errors.service = "Please select a service.";
  values.product = quoteProducts.some(option => option.value === data.product) ? data.product : "";
  return { values, errors };
}
