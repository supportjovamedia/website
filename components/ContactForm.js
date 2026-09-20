"use client";

import { useRef, useState } from "react";

import { serviceOptions, budgetOptions, countryOptions, validateEnquiry } from "@/lib/enquiry-fields.mjs";

import { contactEmail } from "@/lib/site";

export default function ContactForm() {

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const [fields, setFields] = useState({});
  const [service, setService] = useState("");
  const [purpose,setPurpose] = useState("project");
  const isProject = purpose === "project";
  const [messageLength, setMessageLength] = useState(0);

  const result = useRef(null);

  const pending = useRef(false);

  const attempt = useRef(null);

  async function submit(event) {

    event.preventDefault();

    if (pending.current) return;

    const form = event.currentTarget;

    const values = Object.fromEntries(new FormData(form));

    const validation = validateEnquiry(values);
    setFields(validation.errors);
    if (Object.keys(validation.errors).length) {
      form.elements.namedItem(Object.keys(validation.errors)[0])?.focus();
      return;
    }
    const serialized = JSON.stringify(values);

    if (!attempt.current || attempt.current.body !== serialized)

      attempt.current = { body: serialized, id: crypto.randomUUID() };

    pending.current = true;

    setStatus("sending");

    setError("");

    try {

      const response = await fetch("/api/contact", {

        method: "POST",

        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.id },

        body: serialized,

        signal: AbortSignal.timeout(18000),

      });

      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        if (data.fields) setFields(data.fields);
        throw new Error(data.error || "We could not send your enquiry. Please try again.");
      }

      setStatus("success");

      form.reset();
      setService("");
      setMessageLength(0);

      attempt.current = null;

    } catch (err) {

      setStatus("error");

      setError(err.name === "TimeoutError" || err.name === "AbortError"

        ? "We could not confirm receipt. Please try again; your details are still here."

        : err.message || "Something went wrong. Please try again or email us directly.");

    } finally {

      pending.current = false;

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

      className="form"
      noValidate

      onSubmit={submit}

      aria-busy={status === "sending"}

      onChange={() => { if (status === "success") setStatus("idle"); }}

    >

      <div>

        <p className="kicker">Your message</p>

        <h2 style={{ fontSize: 28 }}>What do you have in mind?</h2>

      </div>

      <p className="form-note">Fields marked <span className="required-mark" aria-hidden="true">*</span> are required. Please complete them so we can understand your enquiry.</p>
      <fieldset className="contact-fields" disabled={status === "sending"}>
        <label><span>How can we help?</span><select value={purpose} onChange={event=>{setPurpose(event.target.value);setFields({});}}><option value="project">Start a project</option><option value="question">General enquiry</option><option value="support">Existing client support</option></select></label>
        <div className="two">
          <label><span>Your name <Required /></span>
            <input name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan" {...fieldProps("name")} />
            {fieldError("name")}
          </label>
          <label><span>Email address <Required /></span>
            <input name="email" type="email" autoComplete="email" required maxLength={200} placeholder="alex@yourcompany.com" {...fieldProps("email")} />
            {fieldError("email")}
          </label>
        </div>
        {isProject ? <>
        <label>Company <span className="optional">Optional</span>
          <input name="company" autoComplete="organization" maxLength={150} placeholder="Your company" {...fieldProps("company")} />
          {fieldError("company")}
        </label>
        <div className="two">
          <label><span>Country <Required /></span>
            <select name="country" autoComplete="country" defaultValue="" required {...fieldProps("country")}>
              <option value="" disabled>Select your country</option>
              {countryOptions.map(({code, name}) => <option key={code} value={code}>{name}</option>)}
            </select>
            {fieldError("country")}
          </label>
          <label><span>Monthly budget (GBP) <Required /></span>
            <select name="budget" defaultValue="" required {...fieldProps("budget", "budget-hint")}>
              <option value="" disabled>Select your monthly budget</option>
              {budgetOptions.map(budget => <option key={budget}>{budget}</option>)}
            </select>
            <span className="field-hint" id="budget-hint">For ongoing support, in British pounds. For a one-off project, include your total budget in the description too.</span>
            {fieldError("budget")}
          </label>
        </div>
        <label><span>I’m interested in <Required /></span>
          <select name="service" value={service} onChange={event => setService(event.target.value)} required {...fieldProps("service")}>
            <option value="" disabled>Select a service</option>
            {serviceOptions.map(name => <option key={name}>{name}</option>)}
            <option>Other</option>
          </select>
          {fieldError("service")}
        </label>
        {service === "Other" && <label><span>Please specify <Required /></span>
          <input name="other" required minLength={10} maxLength={500} placeholder="Tell us what support you need" {...fieldProps("other", "other-hint")} />
          <span className="field-hint" id="other-hint">At least 10 characters.</span>
          {fieldError("other")}
        </label>}
        <label>Ideal timing <span className="optional">Optional</span>
          <select name="timing" defaultValue="Let’s discuss" {...fieldProps("timing")}>
            <option>Let’s discuss</option><option>As soon as possible</option><option>Within 1–3 months</option><option>Within 3–6 months</option><option>Planning ahead</option>
          </select>
          {fieldError("timing")}
        </label>
        </> : <input type="hidden" name="service" value={purpose === "support" ? "Existing client support" : "General enquiry"} />}
        <label><span>{isProject ? "Tell us a little about the project" : "Your message"} <Required /></span>
          <textarea name="message" required minLength={isProject ? 100 : 10} maxLength={3000} rows={5} placeholder={isProject ? "Tell us about your business, what you need and what you’d like to achieve." : "Ask your question or tell us what you need help with."} onChange={event => setMessageLength(event.target.value.trim().length)} {...fieldProps("message", "message-hint")} />
          <span className="field-hint" id="message-hint">At least {isProject ? 100 : 10} characters. {messageLength.toLocaleString("en-GB")} / 3,000 characters.</span>
          {fieldError("message")}
        </label>
      </fieldset>
      <div className="contact-trap" aria-hidden="true">

        <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>

      </div>

      <p className="form-note">By sending your enquiry, you share these details so we can respond. Read our <a className="text-link" href="/privacy-policy">privacy policy</a>. We aim to reply within 1–3 working days.</p>

      <button type="submit" className="btn blue" disabled={status === "sending" || status === "success"}>

        {status === "sending" ? "Sending…" : status === "success" ? "Enquiry sent" : "Send enquiry"}

      </button>

      {(status === "success" || status === "error") && <section ref={result} tabIndex={-1} role={status === "success" ? "status" : "alert"} className={`contact-feedback ${status}`}>

        <h3>{status === "success" ? "Thank you — we’ve received your enquiry." : "Your enquiry needs another try."}</h3>

        <p>{status === "success" ? "We’ll reply within 1–3 working days. We look forward to hearing more about your project." : error}</p>

        {status === "error" && <a href={`mailto:${contactEmail}`}>Email {contactEmail}</a>}

      </section>}

    </form>

  );

}

function Required() { return <span className="required-mark" aria-hidden="true">*</span>; }
