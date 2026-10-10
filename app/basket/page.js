import Basket from "@/components/Basket";
import { checkoutConfigured } from "@/lib/checkout.mjs";
export const metadata = { title: "Your basket | JovaMedia", robots: { index: false, follow: false } };
export default async function BasketPage({ searchParams }) {
  const params = await searchParams;
  return <main><Basket cancelled={params?.checkout === "cancelled"} checkoutAvailable={checkoutConfigured()} /></main>;
}
