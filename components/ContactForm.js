"use client";

import { useRef, useState } from "react";
import RecaptchaCheckbox from "./RecaptchaCheckbox";

import { validateEnquiry } from "@/lib/enquiry-fields.mjs";

import { contactEmail } from "@/lib/site";
import { trackEvent } from "@/lib/marketing-analytics.mjs";

export default function ContactForm() {

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const [fields, setFields] = useState({});
  const [service, setService] = useState("");
  const [messageLength, setMessageLength] = useState(0);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptcha = useRef(null);

  const result = useRef(null);

  const pending = useRef(false);

  const attempt = useRef(null);

  async function submit(event) {

    event.preventDefault();

    if (pending.current) return;

    const form = event.currentTarget;

    const values = Object.fromEntries(new FormData(form));
    // Google adds this field. Tokens must not change an enquiry's retry identity.
    delete values["g-recaptcha-response"];

    const validation = validateEnquiry(values);
    setFields(validation.errors);
    if (Object.keys(validation.errors).length) {
      trackEvent("form_validation_error", { form_id: "contact_enquiry", error_stage: "validation", field_name: Object.keys(validation.errors)[0] });
      form.elements.namedItem(Object.keys(validation.errors)[0])?.focus();
      return;
    }
    if (!recaptchaToken) {
      trackEvent("form_validation_error", { form_id: "contact_enquiry", error_stage: "verification" });
      setStatus("error");
      setError("Please complete the I'm not a robot checkbox before sending your enquiry.");
      requestAnimationFrame(() => result.current?.focus());
      return;
    }
    const serialized = JSON.stringify(values);

    if (!attempt.current || attempt.current.body !== serialized)

      attempt.current = { body: serialized, id: crypto.randomUUID() };

    pending.current = true;

    setStatus("sending");

    setError("");
    trackEvent("form_submit", { form_id: "contact_enquiry" });

    try {

      const response = await fetch("/api/contact", {

        method: "POST",

        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.id },

        body: JSON.stringify({ ...values, recaptchaToken }),

        signal: AbortSignal.timeout(25000),

      });

      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (data.fields) setFields(data.fields);
        throw new Error(data.error || "We could not send your enquiry. Please try again.");
      }

      setStatus("success");
      trackEvent("generate_lead", { form_id: "contact_enquiry" });

      form.reset();
      setService("");
      setMessageLength(0);

      attempt.current = null;

    } catch (err) {
      trackEvent("form_error", { form_id: "contact_enquiry", error_stage: "delivery" });

      setStatus("error");

      setError(err.name === "TimeoutError" || err.name === "AbortError"

        ? "We could not confirm receipt. Please try again; your details are still here."

        : err.message || "Something went wrong. Please try again or email us directly.");

    } finally {

      pending.current = false;
      // Tokens are single-use, including when email delivery needs a retry.
      recaptcha.current?.reset();
      setRecaptchaToken("");

      requestAnimationFrame(() => result.current?.focus());

    }

  }

  function fieldProps(name, hint) {
    return { "aria-invalid": fields[name] ? true : undefined, "aria-describedby": [hint, fields[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined };
  }
  function fieldError(name) {
    return fields[name] && <span className="field-error" id={`${name}-error`}>{fields[name]}</span>;
  }

  return (

    <form
      data-analytics-form="contact_enquiry"
      data-enquiry-form
      data-clarity-mask="true"

      className="form"
      noValidate

      onSubmit={submit}

      aria-busy={status === "sending"}

      onChange={() => { if (status === "success") setStatus("idle"); }}

    >

      <div>

        <p className="kicker">Your message</p>

        <h2 style={{ fontSize: 28 }}>Get in touch</h2>

      </div>

      <fieldset className="contact-fields" disabled={status === "sending"}>
        <input type="hidden" name="service" value="General enquiry" />
        <div className="two">
          <label><span>First name <Required /></span><input name="firstName" autoComplete="given-name" required maxLength={50} placeholder="First name" {...fieldProps("firstName")} />{fieldError("firstName")}</label>
          <label><span>Last name <Required /></span><input name="lastName" autoComplete="family-name" required maxLength={50} placeholder="Last name" {...fieldProps("lastName")} />{fieldError("lastName")}</label>
        </div>
        <div className="two">
          <label><span>Email address <Required /></span><input name="email" type="email" autoComplete="email" required maxLength={200} placeholder="name@example.com" {...fieldProps("email")} />{fieldError("email")}</label>
          <label><span className="contact-phone-label">Contact number <span className="field-hint">(optional)</span></span><input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="Your phone number" {...fieldProps("phone")} />{fieldError("phone")}</label>
        </div>
        <label><span>Message <Required /></span>
          <textarea name="message" required minLength={10} maxLength={3000} rows={5} placeholder="Send a message" onChange={event => setMessageLength(event.target.value.trim().length)} {...fieldProps("message", "message-hint")} />
          <span className="field-hint" id="message-hint">At least 10 characters. {messageLength.toLocaleString("en-GB")} / 3,000 characters.</span>{fieldError("message")}
        </label>
      </fieldset>
      <div className="contact-trap" aria-hidden="true">

        <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>

      </div>

      <p className="form-note">By sending your enquiry, you share these details so we can respond. Read our <a className="text-link" href="/privacy-policy">privacy policy</a>. We aim to reply within 1–3 working days.</p>

      <RecaptchaCheckbox ref={recaptcha} onChange={setRecaptchaToken} />

      <button type="submit" className="btn blue" disabled={status === "sending" || status === "success"}>

        {status === "sending" ? "Sending…" : status === "success" ? "Enquiry sent" : "Send enquiry"}

      </button>

      {(status === "success" || status === "error") && <section ref={result} tabIndex={-1} role={status === "success" ? "status" : "alert"} className={`contact-feedback ${status}`}>

        <h3>{status === "success" ? "Thank you, we’ve received your enquiry." : "Your enquiry needs another try."}</h3>

        <p>{status === "success" ? "We’ll reply within 1–3 working days. We look forward to hearing more about your project." : error}</p>

        {status === "error" && <a href={`mailto:${contactEmail}`}>Email {contactEmail}</a>}

      </section>}

    </form>

  );

}

function Required() { return <span className="required-mark" aria-hidden="true">*</span>; }
