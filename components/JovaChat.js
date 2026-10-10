"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import ConsultationLink from "./ConsultationLink";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./JovaChat.module.css";

export default function JovaChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const close = useRef(null);
  const launch = useRef(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const escape = event => { if (event.key === "Escape") { setOpen(false); launch.current?.focus(); } };
    addEventListener("keydown", escape);
    return () => removeEventListener("keydown", escape);
  }, [open]);
  if (pathname.startsWith("/preview/") || pathname.startsWith("/checkout/")) return null;
  const answers = {
    "A new website": "A focused landing page starts at £350. A home, services and contact website starts at £550. Tell us about your business and we can help you choose the right approach.",
    "Improve my website": "A fresh look is one option. Improving the structure, mobile experience or enquiry journey might be enough. Share your website in a free consultation and we can talk through it.",
    "Branding or marketing": "We can help with visual identity, social content and campaigns. Send us a project enquiry with what you need, and we will discuss the scope with you.",
    "Online bookings": "The Pro package starts at £2,000 and includes a website with appointment booking. We confirm your services, availability and scheduling needs before work begins.",
  };
  return <aside className={s.widget} aria-label="JovaMedia website guide">
    {open && <section className={s.panel} role="dialog" aria-label="Website guide">
      <header><span className={s.mark}>J</span><div><strong>Let’s find your next step.</strong><span>JovaMedia website guide</span></div><button type="button" ref={close} onClick={() => { setOpen(false); launch.current?.focus(); }} aria-label="Close website guide"><X size={19} /></button></header>
      <div className={s.body}><p className={s.welcome}>Hello. What are you planning?</p><p className={s.note}>Quick answers, then a real conversation with us.</p><div className={s.choices}>{Object.keys(answers).map(label => <button key={label} type="button" aria-pressed={choice === label} onClick={() => { setChoice(label); trackEvent("ui_click", { element_type: "button" }); }}>{label}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div>
        {choice && <div className={s.answer} role="status"><p>{answers[choice]}</p>{choice === "Branding or marketing" ? <Link href="/contact" className={s.cta}>Tell us about your project <ArrowUpRight size={17} aria-hidden="true" /></Link> : <ConsultationLink className={s.cta} placement="other">Request a free consultation <ArrowUpRight size={17} aria-hidden="true" /></ConsultationLink>}<Link href="/pricing" className={s.pricing}>Explore website packages</Link></div>}
      </div><footer>Prefer email? <a href="mailto:support.jovamedia@gmail.com">Talk to JovaMedia</a></footer>
    </section>}
    <button ref={launch} type="button" className={s.launcher} aria-expanded={open} aria-label={open ? "Hide website guide" : "Open website guide"} onClick={() => { setOpen(!open); trackEvent("ui_click", { element_type: "button" }); }}><MessageCircle size={20} aria-hidden="true" /><span>Let’s talk websites</span></button>
  </aside>;
}
