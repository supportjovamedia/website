"use client";
import Link from "next/link";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
export default function ConsultationLink({ children = "Get my free website consultation", className, placement = "other", ...props }) {
  return <Link {...props} href="/consultation" className={className} onClick={() => trackEvent("consultation_click", { placement, destination: "/consultation" })}>{children}</Link>;
}
