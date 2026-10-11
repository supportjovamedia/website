import { Phone } from "lucide-react";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
import s from "./BusinessContact.module.css";

export function WhatsAppIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.6 5.98L.02 24l6.26-1.64a11.9 11.9 0 0 0 5.76 1.47h.01C18.63 23.83 24 18.48 24 11.9c0-3.18-1.24-6.18-3.48-8.42Zm-8.47 18.34a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.87 9.87 0 0 1-1.52-5.28c0-5.46 4.44-9.9 9.91-9.9a9.84 9.84 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.45-4.45 9.89-9.92 9.89Zm5.44-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.49-1.78-1.66-2.08-.18-.3-.02-.46.13-.61.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48c0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" /></svg>;
}

export default function BusinessContact({ placement = "contact" }) {
  return <section className={s.panel} aria-label="Talk to JovaMedia directly">
    <p className={s.title}>Prefer a quick conversation?</p>
    <p className={s.copy}>Tell us what you have in mind on WhatsApp, or give us a call.</p>
    <div className={s.actions}>
      <a className={s.whatsapp} href={whatsappLink(placement)} target="_blank" rel="noopener noreferrer" data-contact-placement="content"><WhatsAppIcon />Chat on WhatsApp<span aria-hidden="true">↗</span></a>
      <a className={s.call} href={businessPhone.tel} data-contact-placement="content"><Phone size={17} aria-hidden="true" />Call {businessPhone.display}</a>
    </div>
    <p className={s.note}>No form needed. If we’re away, leave a message and we’ll get back to you.</p>
  </section>;
}
