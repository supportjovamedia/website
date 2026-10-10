import { createCheckoutHandler } from "@/lib/checkout.mjs";
import { stripeClient } from "@/lib/stripe-server";
export const runtime = "nodejs";
const handler = createCheckoutHandler({ stripe: { checkout: { sessions: { create: (...args) => stripeClient().checkout.sessions.create(...args) } } } });
export async function POST(request) { return handler(request); }
