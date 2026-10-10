import { createContactHandler } from "./contact-delivery.mjs";
import { validateQuote, quoteOptions, quoteProducts } from "./quote-fields.mjs";

export function createQuoteHandler(options = {}) {
  return createContactHandler({ ...options, validate: validateQuote, buildMail: values => ({
    subject: "New JovaMedia quote callback request",
    text: `Callback requested\n\nName: ${values.name}\nEmail: ${values.email}\nPhone: ${values.phone || "Not supplied, please email to arrange contact"}\nInterested in: ${quoteOptions.find(option => option.value === values.service).label}${values.product ? `\nPricing option: ${quoteProducts.find(option => option.value === values.product).label}` : ""}\n\nPlease contact this person to discuss their requirements and confirm the scope before quoting.`,
  }) });
}
