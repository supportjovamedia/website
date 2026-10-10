import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "@/components/Commerce.module.css";
export const metadata = pageMetadata("/pricing", "Website Products & Care | JovaMedia", "Landing Page from £350, Business Website from £550, Website with Booking System from £2,000, plus Web Care £39/month and Web Care Pro £99/month.");
export default function PricingPage() {
  return <main><section className={`${s.pageHero} ${s.pricingHero}`}><div className={s.container}><h1>A website to launch.<br />Care to keep it going.</h1><p>Website builds and monthly care, with a clear scope for each.</p></div></section><ProductPackages /></main>;
}
