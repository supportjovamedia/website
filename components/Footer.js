import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
export default function Footer(){return <footer className="jova-footer">
 <Link href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128}/></Link>
 <div><h3>Studio</h3><Link href="/about">Our story</Link><Link href="/work">Our work</Link><Link href="/services">Our approach</Link></div>
 <div><h3>Services</h3><Link href="/services">Explore our services</Link><Link href="/contact">Start a project</Link></div>
 <div><h3>Contact</h3><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent/></div>
 <p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p>
 </footer>}
