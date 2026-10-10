import Basket from "@/components/Basket";
import { checkoutConfigured } from "@/lib/checkout.mjs";
import s from "@/components/Commerce.module.css";
export const metadata = { title: "Your basket | JovaMedia", robots: { index: false, follow: false } };
export default async function BasketPage({ searchParams }) {
  const params = await searchParams;
  return <main><section className={s.pageHero}><div className={s.container}><p className={s.eyebrow}>YOUR NEXT STEP</p><h1>A website worth<br />getting started on.</h1><p>Review your products, check the details and take the next step.</p></div></section><Basket cancelled={params?.checkout === "cancelled"} checkoutAvailable={checkoutConfigured()} /></main>;
}
