"use client";
import Link from "next/link";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
export default function ConsultationLink({ className, placement = "other", ...props }) {
  return <Link {...props} href="/get-a-quote" className={className} onClick={() => trackEvent("quote_click", { placement, destination: "/get-a-quote" })}>Get a Quote</Link>;
}
