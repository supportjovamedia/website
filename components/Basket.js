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
  const monthly = items.filter(item => item.interval).reduce((sum, item) => sum + item.amount, 0);
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
  return <>{items.length > 0 && <section className={s.pageHero}><div className={s.container}><h1>Your basket</h1></div></section>}<section className={`${s.basketSection} ${!items.length ? s.emptyBasketSection : ""}`}><div className={s.container}>
    {cancelled && items.length > 0 && <p role="status" className={s.cancelled}>Checkout was cancelled. Your products are still in your basket. You can try again or speak to us first.</p>}
    {!items.length ? <div className={s.empty}><h1>Your basket is empty</h1><Link href="/pricing" className={s.button}>Browse products</Link></div> : <div className={s.basketGrid}>
      <div><div className={s.basketRows}>{items.map(product => <article key={product.id} className={s.basketRow}><div><h2>{product.name}</h2><p>{product.description}</p></div><span className={s.rowPrice}>{formatPrice(product.amount)}{product.interval ? " / month" : ""}</span><button className={s.remove} type="button" onClick={() => remove(product)} disabled={busy} aria-label={`Remove ${product.name} from basket`}>Remove</button></article>)}</div><Link className={s.backLink} href="/pricing">Continue browsing products</Link></div>
      <form className={s.summary} onSubmit={checkout} data-analytics-ignore="true"><h2>Your project basket</h2><div className={s.summaryTotal}><span>{monthly ? "Due today" : "Total"}</span><strong>{formatPrice(total)}</strong></div>{monthly > 0 && <p><strong>Then {formatPrice(monthly)} every month</strong> until cancelled. One-off website builds are charged only once.</p>}<p>{taxNote}</p><p>One of each product and one care plan per order. Hosting, domains and paid software are separate. Read the product scope before ordering.</p>
        {total === null || !checkoutAvailable ? <><p>These products are being prepared for online ordering. No payment can be taken yet. We can help you choose a product and confirm the details.</p><ConsultationLink className={s.button} placement="basket">Get a free consultation</ConsultationLink></> : <><label><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} /><span>I have read the product scope and agree to the <Link href="/terms">terms</Link> and <Link href="/privacy-policy">privacy policy</Link>.</span></label><button className={s.button} type="submit" disabled={busy || !accepted}>{busy ? "Opening secure checkout…" : "Continue to secure checkout"}</button><p>Payment is handled securely by Stripe. We’ll contact you after payment to confirm your brief and next steps.</p></>}
        {error && <p className={s.error} role="alert">{error} <Link href="/consultation">Contact us</Link></p>}
      </form>
    </div>}
  </div></section></>;
}
