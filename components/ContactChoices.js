import Link from "next/link";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "./BusinessContact";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
import s from "./ContactChoices.module.css";

export default function ContactChoices({ compact = false }) {
  return <aside className={`${s.contactChoices} ${compact ? s.contactCompact : ""}`} aria-label="Choose how to contact JovaMedia">
    <div><h2>Have a website<br/>in mind?</h2><p>Tell us about your business and what customers need to do. We can help you work out the scope.</p></div>
    <div className={s.contactLinks}>
      <Link className={s.preview} href="/get-a-quote">Request a free homepage preview</Link>
      <div className={s.direct}>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" data-contact-placement="content"><WhatsAppIcon /><span>Message on WhatsApp</span></a>
        <a href={businessPhone.tel} data-contact-placement="content"><Phone size={20} aria-hidden="true" /><span>Call {businessPhone.display}</span></a>
      </div>
      <p>You can also use website chat to ask a question or leave a message.</p>
    </div>
  </aside>;
}
