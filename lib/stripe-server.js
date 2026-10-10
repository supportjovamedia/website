import "server-only";
import Stripe from "stripe";
let client;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return client ||= new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 12000, maxNetworkRetries: 1 });
}
