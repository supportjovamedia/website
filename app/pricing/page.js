import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "@/components/Commerce.module.css";
export const metadata = pageMetadata("/pricing", "Website Pricing | JovaMedia", "Clear website packages from JovaMedia: Starter landing page £350, Power business website £550 and Pro booking website £2,000. Explore the scope and get free advice.");
export default function PricingPage() {
  return <main><section className={`${s.pageHero} ${s.pricingHero}`}><div className={s.container}><p className={s.eyebrow}>JOVAMEDIA WEBSITE PACKAGES</p><h1>Simple, clear<br />website packages.</h1><p>A focused landing page, a business website or a website that takes bookings.<br />Choose your starting point. We will help with the rest.</p></div></section><ProductPackages /></main>;
}
