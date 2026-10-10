"use client";
import { useRef, useState } from "react";
import RecaptchaCheckbox from "./RecaptchaCheckbox";
import { countryOptions, validateEnquiry } from "@/lib/enquiry-fields.mjs";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./Commerce.module.css";

export default function ConsultationForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [token, setToken] = useState("");
  const captcha = useRef(null);
  const feedback = useRef(null);
  const pending = useRef(false);
  const attempt = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const entries = Object.fromEntries(new FormData(form));
    const values = { name: entries.name, email: entries.email, country: entries.country, service: "Free website consultation", message: `Free website consultation requested.\nWebsite: ${entries.siteUrl || "No existing website"}\nNotes: ${entries.notes || "Please contact me to discuss my website."}`, website: entries.website };
    const validation = validateEnquiry(values);
    setFields(validation.errors);
    if (Object.keys(validation.errors).length) {
      form.elements.namedItem(Object.keys(validation.errors)[0])?.focus();
      trackEvent("form_error", { form_id: "website_consultation" });
      return;
    }
    if (entries.siteUrl) {
      try {
        const url = new URL(entries.siteUrl.includes("://") ? entries.siteUrl : `https://${entries.siteUrl}`);
        if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error();
      } catch { setFields({ siteUrl: "Enter a website address, or leave this blank." }); form.elements.siteUrl.focus(); return; }
    }
    if (!token) {
      setError("Please complete the I'm not a robot checkbox."); setStatus("error");
      requestAnimationFrame(() => feedback.current?.focus()); return;
    }
    const serialized = JSON.stringify(values);
    if (!attempt.current || attempt.current.body !== serialized) attempt.current = { body: serialized, id: crypto.randomUUID() };
    pending.current = true; setStatus("sending"); setError("");
    trackEvent("form_submit", { form_id: "website_consultation" });
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.id }, body: JSON.stringify({ ...values, recaptchaToken: token }), signal: AbortSignal.timeout(25000) });
      const data = await response.json();
      if (!response.ok || !data.ok) { if (data.fields) setFields(data.fields); throw new Error(data.error || "We could not confirm receipt. Please try again."); }
      trackEvent("generate_lead", { form_id: "website_consultation" });
      setStatus("success"); form.reset(); attempt.current = null;
    } catch (failure) {
      trackEvent("form_error", { form_id: "website_consultation" });
      setStatus("error"); setError(failure.name === "TimeoutError" || failure.name === "AbortError" ? "We could not confirm receipt. Please retry; your details are still here." : failure.message);
    } finally {
      pending.current = false; captcha.current?.reset(); setToken("");
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }
  function invalid(name) { return { "aria-invalid": fields[name] ? true : undefined, "aria-describedby": fields[name] ? `consultation-${name}-error` : undefined }; }
  function fieldError(name) { return fields[name] && <span id={`consultation-${name}-error`} className={s.error}>{fields[name]}</span>; }
  return <form id="consultation-form" className={s.form} data-analytics-form="website_consultation" data-clarity-mask="true" onSubmit={submit} noValidate aria-busy={status === "sending"} onChange={() => { if (status === "success") setStatus("idle"); }}>
    <h2>Get your free consultation.</h2>
    <p className={s.formNote}>Leave your details and we’ll email you to arrange a conversation. No payment details needed.</p>
    <label>Your name *<input name="name" autoComplete="name" maxLength={100} required {...invalid("name")} disabled={status === "sending"} />{fieldError("name")}</label>
    <label>Email address *<input name="email" type="email" autoComplete="email" maxLength={200} required {...invalid("email")} disabled={status === "sending"} />{fieldError("email")}</label>
    <label>Country *<select name="country" autoComplete="country" defaultValue="" required {...invalid("country")} disabled={status === "sending"}><option value="" disabled>Select your country</option>{countryOptions.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select>{fieldError("country")}</label>
    <label>Website address <small>Optional. Leave blank if you don’t have a website yet.</small><input name="siteUrl" type="text" inputMode="url" autoComplete="url" placeholder="yourbusiness.co.uk" maxLength={500} {...invalid("siteUrl")} disabled={status === "sending"} />{fieldError("siteUrl")}</label>
    <label>What would you like help with? <small>Optional. A sentence or two is plenty.</small><textarea name="notes" maxLength={2000} rows={3} disabled={status === "sending"} /></label>
    <div className={s.trap} aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className={s.formNote}>We use your details to respond to this request. Read our <a href="/privacy-policy">privacy policy</a>. We aim to reply within 1–3 working days.</p>
    <RecaptchaCheckbox ref={captcha} onChange={setToken} />
    <button className={s.button} type="submit" disabled={status === "sending" || status === "success"}>{status === "sending" ? "Sending your request…" : status === "success" ? "Request sent" : "Request my free consultation"}</button>
    {["error", "success"].includes(status) && <section className={s.feedback} ref={feedback} tabIndex={-1} role={status === "success" ? "status" : "alert"}><h3>{status === "success" ? "Thanks. Let’s talk about your website." : "Your request needs another try."}</h3><p>{status === "success" ? "Your request has been received. We’ll email you within 1–3 working days to arrange your free consultation." : error}</p>{status === "error" && <a href="mailto:support.jovamedia@gmail.com">Email us instead</a>}</section>}
  </form>;
}
