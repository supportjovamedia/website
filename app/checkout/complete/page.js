import Link from "next/link";
import { stripeClient } from "@/lib/stripe-server";
import { paidOrder } from "@/lib/checkout.mjs";
import { productById, formatPrice } from "@/lib/products.mjs";
import PurchaseConfirmation from "@/components/PurchaseConfirmation";
import s from "@/components/Commerce.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Order status | JovaMedia", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function OrderCompletePage({ searchParams }) {
  const { session_id: id } = await searchParams;
  let order = null;
  if (typeof id === "string" && /^cs_(?:test|live)_[a-zA-Z0-9]{10,240}$/.test(id) && stripeClient()) {
    try { order = paidOrder(await stripeClient().checkout.sessions.retrieve(id)); } catch { /* A failure is not a successful payment. */ }
  }
  return <main><section className={s.pageHero}><div className={s.container}><p className={s.eyebrow}>YOUR ORDER</p><h1>{order ? order.test ? "Test checkout complete." : "Thank you. Let’s get started." : "Let’s check your order."}</h1></div></section><section className={s.confirmation}><div className={s.container}><div className={s.confirmationBox} data-clarity-mask="true">{order ? <><PurchaseConfirmation order={order} /><h2>{order.test ? "This was a test payment." : "Your payment is confirmed."}</h2><p>{order.test ? "No real payment was taken. This order is in Stripe’s test environment." : "Keep your Stripe receipt. We’ll contact you using the email supplied at checkout to discuss your brief and next steps."}</p><p>Reference: <strong>{order.reference}</strong><br />Total: <strong>{formatPrice(order.amount)}</strong></p><ul>{order.productIds.map(id => <li key={id}>{productById(id).name}</li>)}</ul><p>Questions? Email <a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a> with your reference.</p></> : <><h2>Payment has not been confirmed here.</h2><p>Please check your Stripe receipt before trying another payment. If you were charged, email us and we’ll check the order. This page does not create or confirm a payment by itself.</p><p><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a></p></>}<Link className={s.backLink} href="/products">Back to website packages</Link></div></div></section></main>;
}
