import { createStripeWebhookHandler } from "@/lib/checkout.mjs";
import { stripeClient } from "@/lib/stripe-server";
export const runtime = "nodejs";
const handler = createStripeWebhookHandler({ stripe: { webhooks: { constructEvent: (...args) => stripeClient().webhooks.constructEvent(...args) }, checkout: { sessions: { retrieve: (...args) => stripeClient().checkout.sessions.retrieve(...args), update: (...args) => stripeClient().checkout.sessions.update(...args) } } } });
export async function POST(request) { return handler(request); }
