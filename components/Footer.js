import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
export default function Footer(){return <footer className="jova-footer">
 <Link href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128}/></Link>
 <div><h3>Studio</h3><Link href="/about">Our story</Link><Link href="/work">Our work</Link><Link href="/services">Our approach</Link></div>
 <div><h3>Services</h3><Link href="/services">Explore our services</Link><Link href="/get-a-quote">Get a Quote</Link><Link href="/contact">Contact Us</Link></div>
 <div><h3>Contact</h3><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><a href={businessPhone.tel}>{businessPhone.display}</a><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent/></div>
 <p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p>
 </footer>}
