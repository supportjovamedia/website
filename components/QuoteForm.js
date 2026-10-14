"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { productById, formatPrice } from "@/lib/products.mjs";
import RecaptchaCheckbox from "./RecaptchaCheckbox";
import { quoteOptions, validateQuote } from "@/lib/quote-fields.mjs";
import { contactEmail } from "@/lib/site";
import { trackEvent } from "@/lib/marketing-analytics.mjs";

export default function QuoteForm({ product = "" }) {
  const selectedProduct = productById(product);
  const [status, setStatus] = useState("idle");
  const [fields, setFields] = useState({});
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const pending = useRef(false);
  const attempt = useRef(null);
  const recaptcha = useRef(null);
  const result = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    delete data["g-recaptcha-response"];
    const validation = validateQuote(data);
    setFields(validation.errors);
    if (Object.keys(validation.errors).length) {
      trackEvent("form_validation_error", { form_id: "quote_callback", error_stage: "validation", field_name: Object.keys(validation.errors)[0] });
      form.elements.namedItem(Object.keys(validation.errors)[0])?.focus();
      return;
    }
    if (!token) {
      trackEvent("form_validation_error", { form_id: "quote_callback", error_stage: "verification" });
      setStatus("error");
      setError("Please complete the I'm not a robot checkbox before requesting a quote.");
      requestAnimationFrame(() => result.current?.focus());
      return;
    }
    const body = JSON.stringify(data);
    if (attempt.current?.body !== body) attempt.current = { body, id: crypto.randomUUID() };
    pending.current = true;
    setStatus("sending");
    setError("");
    trackEvent("form_submit", { form_id: "quote_callback" });
    try {
      const response = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.id }, body: JSON.stringify({ ...data, recaptchaToken: token }), signal: AbortSignal.timeout(25000) });
      const receipt = await response.json();
      if (!response.ok || receipt.ok !== true) {
        if (receipt.fields) setFields(receipt.fields);
        throw new Error(receipt.error || "We could not confirm your request. Please try again.");
      }
      setStatus("success");
      trackEvent("generate_lead", { form_id: "quote_callback" });
      form.reset();
      attempt.current = null;
    } catch (err) {
      setStatus("error");
      setError(["TimeoutError", "AbortError"].includes(err.name) ? "We could not confirm receipt. Please try again; your details are still here." : err.message || "Please try again or email us directly.");
      trackEvent("form_error", { form_id: "quote_callback", error_stage: "delivery" });
    } finally {
      pending.current = false;
      recaptcha.current?.reset();
      setToken("");
      requestAnimationFrame(() => result.current?.focus());
    }
  }
  const props = name => ({ "aria-invalid": fields[name] ? true : undefined, "aria-describedby": fields[name] ? `quote-${name}-error` : undefined });
  const feedback = name => fields[name] && <span className="field-error" id={`quote-${name}-error`}>{fields[name]}</span>;
  return <form className="form" data-enquiry-form noValidate onSubmit={submit} data-analytics-form="quote_callback" data-clarity-mask="true" aria-busy={status === "sending"} onChange={() => { if (status === "success") setStatus("idle"); }}>
    <div><h1>Get a Quote</h1><p className="form-note">Leave your details and we’ll get in touch about what you need.</p></div>
    {selectedProduct && <section className="quote-package" aria-label="Selected product"><div><span className="quote-package-label">Selected product</span><h2>{selectedProduct.name}</h2><p>{selectedProduct.interval ? "" : "From "}{formatPrice(selectedProduct.amount)}{selectedProduct.interval ? " / month" : " · One-off build"}</p></div><Link href="/pricing">Change product</Link></section>}
    {product && <input type="hidden" name="product" value={product} />}
    <fieldset className="contact-fields" disabled={status === "sending"}>
      <label><span>Name <Required /></span><input name="name" autoComplete="name" required maxLength={100} {...props("name")} />{feedback("name")}</label>
      <label><span>Email address <Required /></span><input name="email" type="email" autoComplete="email" required maxLength={200} {...props("email")} />{feedback("email")}</label>
      <label><span>Phone number <span className="quote-optional">(optional)</span></span><input name="phone" type="tel" autoComplete="tel" maxLength={40} {...props("phone")} />{feedback("phone")}</label>
      <label><span>Service <Required /></span><span className="quote-select"><select name="service" required defaultValue={product ? "service-0" : ""} {...props("service")}>
        <option value="">Select a service</option>
        {quoteOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></span>{feedback("service")}</label>
    </fieldset>
    <div className="contact-trap" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="form-note">We’ll use these details to respond to your request. Read our <a className="text-link" href="/privacy-policy">privacy policy</a>.</p>
    <RecaptchaCheckbox ref={recaptcha} onChange={setToken} />
    <button className="btn blue" type="submit" disabled={status === "sending" || status === "success"}>{status === "sending" ? "Sending…" : status === "success" ? "Request sent" : "Request a quote"}</button>
    {["success", "error"].includes(status) && <section ref={result} tabIndex={-1} role={status === "success" ? "status" : "alert"} className={`contact-feedback ${status}`}><h3>{status === "success" ? "Thank you, we’ve received your request." : "Your request needs another try."}</h3><p>{status === "success" ? "We aim to reply within 1–3 working days to discuss your project." : error}</p>{status === "error" && <a href={`mailto:${contactEmail}`}>Email {contactEmail}</a>}</section>}
  </form>;
}

function Required() { return <span className="required-mark" aria-hidden="true">*</span>; }
