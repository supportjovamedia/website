"use client";
import { useState } from "react";
import Link from "next/link";
import s from "./jovabook.module.css";

const plans = [
  { name: "Essential", monthly: 20, annual: 192, equivalent: 16, commission: 1, description: "For an owner running their own diary.", features: ["One owner, one calendar", "Online bookings, clients and services", "A one-page business website", "Booking emails when delivery is activated"], available: true },
  { name: "Standard", monthly: 50, annual: 480, equivalent: 40, commission: 1, description: "For a team sharing one booking workspace.", features: ["Up to 5 staff", "Online bookings, clients and services", "A business website", "Insights for your business"], available: false },
  { name: "Premium", monthly: 100, annual: 960, equivalent: 80, commission: 0, description: "For a larger team with more appointments.", features: ["Up to 10 staff", "Online bookings, clients and services", "A business website", "Insights and 0% booking commission"], available: false },
];

export default function EssentialOffer() {
  const [cadence, setCadence] = useState("monthly");
  const annual = cadence === "annual";
  const entry = `https://book.jovamedia.com/?portal=owner&plan=essential&cadence=${cadence}`;
  return <div id="essential-plan" className={s.offer}>
    <div className={s.billingBar}><div className={s.cadence} role="group" aria-label="Billing frequency"><button type="button" aria-pressed={!annual} onClick={()=>setCadence("monthly")}>Monthly</button><button type="button" aria-pressed={annual} onClick={()=>setCadence("annual")}>Yearly <span>Save 20%</span></button></div><p>All yearly plans are paid upfront.</p></div>
    <div className={s.planGrid}>{plans.map(plan => <article key={plan.name} className={`${s.plan} ${plan.available ? s.essential : ""}`} aria-label={`${plan.name} plan`}>
      <div className={s.planTop}><h3>{plan.name}</h3><span>{plan.available ? "Available now" : "Talk to us"}</span></div><p className={s.planDescription}>{plan.description}</p>
      <div className={s.priceBlock} aria-live="polite" aria-atomic="true"><p className={s.price}>£{annual ? plan.annual : plan.monthly}<span>/{annual ? "year" : "month"}</span></p><p className={s.priceExplanation}>{annual ? `£${plan.annual} paid upfront. £${plan.equivalent}/month equivalent.` : "Billed monthly."}</p><p className={s.commission}>{plan.commission ? "+ 1% booking commission" : "0% booking commission"}</p><p className={s.commissionBasis}>{plan.commission ? "On the full service price, billed monthly when appointments take place." : "No JovaBook commission on your appointments."}</p></div>
      <ul className={s.planFeatures}>{plan.features.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
      <div className={s.planAction}>{plan.available ? <a className={s.primaryButton} href={`${entry}#signup`}>Start with Essential</a> : <Link className={s.planButton} href={`/contact?subject=JovaBook%20${plan.name}`}>Ask about {plan.name}</Link>}<p>{plan.available ? "Try the workspace free for 3 days. Choose whether to subscribe." : "Check availability and what your team needs before subscribing."}</p></div>
    </article>)}</div>
    <div className={s.billingFootnote}><p>Annual plans save 20% on the subscription. Any booking commission is still billed monthly. Payment-processing fees are separate.</p><a href={`${entry}#login`}>Already have an account? Log in</a></div>
  </div>;
}
