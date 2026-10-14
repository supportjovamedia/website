import Link from "next/link";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
import s from "./Editorial.module.css";

export default function ContactChoices({ compact = false }) {
  return <aside className={`${s.contactChoices} ${compact ? s.contactCompact : ""}`} aria-label="Choose how to contact JovaMedia">
    <div><h2>Have a website<br/>in mind?</h2><p>Tell us about your business and what customers need to do. We can help you work out the scope.</p></div>
    <div className={s.contactLinks}><Link href="/get-a-quote">Request a free homepage preview</Link><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">Message on WhatsApp</a><a href={businessPhone.tel}>Call {businessPhone.display}</a><p>You can also use website chat to ask a question or leave a message.</p></div>
  </aside>;
}
