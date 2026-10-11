"use client";
import Link from "next/link";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
export default function ConsultationLink({ className, placement = "other", ...props }) {
  return <Link {...props} data-enquiry-cta href="/get-a-quote" className={className} onClick={() => trackEvent("quote_click", { placement, destination: "/get-a-quote" })}>{placement === "hero" ? "free website preview" : "Get a Quote"}</Link>;
}
