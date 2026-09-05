import localFont from 'next/font/local';
import './globals.css';
import './direction.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {Analytics} from '@vercel/analytics/react';
const jakarta=localFont({src:'./fonts/plus-jakarta-sans.woff2',display:'swap',variable:'--font-jakarta',weight:'200 800',fallback:['Arial']});
export const metadata={metadataBase:new URL('https://jovamedia.com'),title:{default:'Digital Marketing Agency London | JovaMedia',template:'%s | JovaMedia'},description:'JovaMedia is a London digital agency specialising in websites, SEO, paid media, content, social and brand strategy.',openGraph:{title:'JovaMedia — Brands grow with purpose.',description:'Strategy, creative, media and technology for ambitious businesses.',url:'https://jovamedia.com',siteName:'JovaMedia',locale:'en_GB',type:'website'},twitter:{card:'summary_large_image'}};
const organisation={'@context':'https://schema.org','@type':'Organization',name:'JovaMedia',url:'https://jovamedia.com',logo:'https://jovamedia.com/brand/jova-logo.png',email:'support@jovamedia.com',address:{'@type':'PostalAddress',addressLocality:'London',addressCountry:'GB'}};
export default function RootLayout({children}){return <html className={jakarta.variable} lang="en-GB" data-scroll-behavior="smooth"><body><Header/><div id="main-content" tabIndex={-1}>{children}</div><Footer/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organisation)}}/>{process.env.NEXT_PUBLIC_ENABLE_ANALYTICS==='true'&&<Analytics/>}</body></html>}
