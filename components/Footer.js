import Image from 'next/image';
import Link from 'next/link';

const socials=['Instagram','TikTok','X / Twitter','Facebook','LinkedIn'];

export default function Footer(){return <footer>
  <section className="get-in-touch"><div className="shell get-in-touch-grid"><div><span className="kicker">GET IN TOUCH</span><h2>Ready to make your brand impossible to overlook?</h2></div><div><p>Tell us where you want to go. We’ll help turn the ambition into a focused digital plan across strategy, creative, media and technology.</p><Link href="/contact" className="footer-arrow">Start a conversation <span>↗</span></Link></div></div></section>
  <div className="shell footer-grid"><div><Link href="/" className="footer-logo"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={754} height={390}/></Link><p className="muted">Strategy, creative, media and digital experiences for ambitious brands.</p></div><div><b>Explore</b><Link href="/">Home</Link><Link href="/services">Services</Link><Link href="/work">Work</Link><Link href="/about">About</Link></div><div><b>Services</b><Link href="/services/social-management">Social media</Link><Link href="/services/paid-media">Paid media</Link><Link href="/services/web-design">Web design</Link><Link href="/services/seo">SEO</Link><Link href="/services/content-production">Content production</Link></div><div><b>Contact</b><a href="mailto:support@jovamedia.com">support@jovamedia.com</a><span className="muted">London, United Kingdom</span><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link></div></div>
  <div className="shell social-row"><span>Follow JovaMedia</span><div>{socials.map(s=><button key={s} className="social-placeholder" type="button" aria-label={`${s} link coming soon`}>{s}<span>↗</span></button>)}</div></div>
  <div className="shell copyright">© {new Date().getFullYear()} JovaMedia. All rights reserved.</div>
</footer>}
