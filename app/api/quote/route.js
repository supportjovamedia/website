import { createQuoteHandler } from "@/lib/quote-delivery.mjs";
export const runtime = "nodejs";
export const POST = createQuoteHandler();
