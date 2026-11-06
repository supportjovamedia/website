// Service payments are separate from JovaBook's GBP subscription catalogue.
// Stripe's published same-settlement-currency floors, in minor units.
// Currency conversion can still impose a higher provider minimum.
const minimums = Object.freeze({ gbp: 30, usd: 50, aud: 50, cad: 50 });
export const isServiceCurrency = value => typeof value === "string" && Object.hasOwn(minimums, value);
export function serviceCurrency(value = "GBP") {
  if (typeof value !== "string" || !isServiceCurrency(value.toLowerCase())) throw Error("Unsupported service currency.");
  return value.toLowerCase();
}
export function validDepositAmount(amount, currency) {
  return isServiceCurrency(currency) && Number.isSafeInteger(amount) && amount >= minimums[currency] && amount <= 1000000;
}
