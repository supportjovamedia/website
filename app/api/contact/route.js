import { createContactHandler } from "@/lib/contact-delivery.mjs";
export const runtime = "nodejs";
export const POST = createContactHandler();
