"use client";
import { useId, useState } from "react";
import { compareBookingCosts } from "@/lib/booking-costs.mjs";
import s from "./Editorial.module.css";

const fields = [
  ["appointmentPrice", "Average appointment (£)", 60, 100000],
  ["newClients", "New commissioned clients / month", 20, 10000],
  ["commissionPercent", "Your acquisition commission (%)", 35, 100],
  ["monthlySubscription", "Current subscription / month (£)", 0, 100000],
  ["customBuild", "Custom build quote (£)", 2000, 1000000],
  ["customMonthly", "Custom running costs / month (£)", 20, 100000],
];
const money = value => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
export default function BookingCostCalculator() {
  const id = useId();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key, , initial]) => [key, String(initial)])));
  const inputs = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? NaN : Number(value)]));
  const result = compareBookingCosts(inputs);
  return <section className={s.calculator} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Compare the first year.</h3>
    <p>Editable illustration, before VAT and payment processing. The defaults are example assumptions, not a provider quote.</p>
    <div className={s.calculatorFields}>{fields.map(([key, label, , max]) => <label key={key} htmlFor={`${id}-${key}`}>{label}<input id={`${id}-${key}`} type="number" inputMode="decimal" min="0" max={max} step={key === "newClients" ? "1" : "0.01"} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}/></label>)}</div>
    <div className={s.calculatorResults} aria-live="polite" aria-atomic="true">{result ? <>
      <div><span>Platform charges, first year</span><strong>{money(result.platformYear)}</strong></div>
      <div><span>Custom build + running costs, first year</span><strong>{money(result.customYear)}</strong></div>
      <p>{result.difference >= 0 ? `Custom is ${money(result.difference)} lower in this illustration.` : `The platform is ${money(-result.difference)} lower in this illustration.`}</p>
    </> : <p role="status">Enter a valid non-negative number in every field. Commission must be between 0% and 100%.</p>}</div>
    <p className={s.finePrint}>This assumes the same appointments would arrive directly and that the quoted custom system meets your needs. It excludes the cost of attracting those customers, migration, differences in features, extra support, VAT and payment processing. A lower total is not a savings forecast.</p>
  </section>;
}
