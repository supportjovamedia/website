import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "@/components/Commerce.module.css";
export const metadata = pageMetadata("/pricing", "Website Products & Care | JovaMedia", "Browse Landing Page £350, Business Website £550, Website with Booking System £2,000, plus Web Care £39/month and Web Care Pro £99/month.");
export default function PricingPage() {
  return <main><section className={`${s.pageHero} ${s.pricingHero}`}><div className={s.container}><p className={s.eyebrow}>JOVAMEDIA PRODUCTS</p><h1>A website to launch.<br />Care to keep it going.</h1><p>Browse website builds and monthly care subscriptions.<br />Different products for different needs, with a clear scope for each.</p></div></section><ProductPackages /></main>;
}
