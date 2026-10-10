"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBasket, removeFromBasket } from "@/lib/basket-store";
import { basketItems, basketTotal, formatPrice, taxNote } from "@/lib/products.mjs";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import ConsultationLink from "./ConsultationLink";
import s from "./Commerce.module.css";

export default function Basket({ cancelled = false, checkoutAvailable = false }) {
  const ids = useBasket();
  const items = basketItems(ids);
  const total = basketTotal(items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const attempt = useRef(null);
  const pending = useRef(false);
  const fingerprint = ids.slice().sort().join(",");
  useEffect(() => { if (fingerprint) trackEvent("view_cart", { product_ids: fingerprint.split(","), value: total === null ? undefined : total / 100 }); }, [fingerprint, total]);
  async function checkout(event) {
    event.preventDefault();
    if (pending.current || !accepted) return;
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) attempt.current = { id: crypto.randomUUID(), fingerprint };
    pending.current = true; setBusy(true); setError("");
    trackEvent("begin_checkout", { product_ids: ids, value: total === null ? undefined : total / 100 });
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.id }, body: JSON.stringify({ productIds: ids, termsAccepted: true }), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be opened. Please try again.");
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") throw new Error("Checkout could not be opened. Please contact us.");
      window.location.assign(destination.toString());
    } catch (failure) {
      trackEvent("checkout_error", {});
      setError(failure.name === "TimeoutError" || failure.name === "AbortError" ? "Checkout took too long to respond. Your basket is still here. Please try again." : failure.message);
      pending.current = false; setBusy(false);
    }
  }
  function remove(product) { removeFromBasket(product.id); setAccepted(false); trackEvent("remove_from_cart", { product_id: product.id }); }
  return <section className={s.basketSection}><div className={s.container}>
    {cancelled && <p role="status" className={s.cancelled}>Checkout was cancelled. Your packages are still in your basket. You can try again or speak to us first.</p>}
    {!items.length ? <div className={s.empty}><h2>Your next project starts here.</h2><p>Your basket is empty. Explore the packages or talk through your options with us first.</p><Link href="/pricing" className={s.button}>Explore website packages</Link><p><ConsultationLink className={s.textLink} placement="basket" /></p></div> : <div className={s.basketGrid}>
      <div><div className={s.basketRows}>{items.map(product => <article key={product.id} className={s.basketRow}><div><h2>{product.name}</h2><p>{product.description}</p></div><span className={s.rowPrice}>{formatPrice(product.amount)}</span><button className={s.remove} type="button" onClick={() => remove(product)} disabled={busy} aria-label={`Remove ${product.name} from basket`}>Remove</button></article>)}</div><Link className={s.backLink} href="/pricing">Continue browsing packages</Link></div>
      <form className={s.summary} onSubmit={checkout} data-analytics-ignore="true"><h2>Your project basket</h2><div className={s.summaryTotal}><span>Total</span><strong>{formatPrice(total)}</strong></div><p>{taxNote}</p><p>One of each package per order. Hosting, domains and third-party subscriptions are separate. Read the scope on the packages page before ordering.</p>
        {total === null || !checkoutAvailable ? <><p>These packages are being prepared for online ordering. No payment can be taken yet. We can help you choose a package and confirm the details.</p><ConsultationLink className={s.button} placement="basket">Get a free consultation</ConsultationLink></> : <><label><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} /><span>I have read the package scope and agree to the <Link href="/terms">terms</Link> and <Link href="/privacy-policy">privacy policy</Link>.</span></label><button className={s.button} type="submit" disabled={busy || !accepted}>{busy ? "Opening secure checkout…" : "Continue to secure checkout"}</button><p>Payment is handled securely by Stripe. We’ll contact you after payment to confirm your brief and next steps.</p></>}
        {error && <p className={s.error} role="alert">{error} <Link href="/consultation">Contact us</Link></p>}
      </form>
    </div>}
  </div></section>;
}
