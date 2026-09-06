"use client";

import { useRef, useState } from "react";

import { contactEmail } from "@/lib/site";

export default function ContactForm() {

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const result = useRef(null);

  const pending = useRef(false);

  const attempt = useRef(null);

  async function submit(event) {

    event.preventDefault();

    if (pending.current) return;

    const form = event.currentTarget;

    const values = Object.fromEntries(new FormData(form));

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

      if (!response.ok || data.ok !== true) throw new Error(data.error || "We could not send your enquiry. Please try again.");

      setStatus("success");

      form.reset();

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

  return (

    <form

      className="form"

      onSubmit={submit}

      aria-busy={status === "sending"}

      onChange={() => { if (status === "success") setStatus("idle"); }}

    >

      <div>

        <p className="kicker">Your project</p>

        <h2 style={{ fontSize: 28 }}>What do you have in mind?</h2>

      </div>

      <fieldset className="contact-fields" disabled={status === "sending"}>
      <div className="two">

        <label>

          Your name

          <input

            name="name"

            autoComplete="name"

            required

            maxLength={100}

            placeholder="Alex Morgan"

          />

        </label>

        <label>

          Email address

          <input

            name="email"

            type="email"

            autoComplete="email"

            required

            maxLength={200}

            placeholder="alex@yourcompany.com"

          />

        </label>

      </div>

      <label>

        Company <span className="optional">Optional</span>

        <input

          name="company"

          autoComplete="organization"

          maxLength={150}

          placeholder="Your company"

        />

      </label>

      <div className="two">

        <label>

          I’m interested in

          <select name="service" defaultValue="A little guidance">

            <option>A little guidance</option>

            <option>Brand & strategy</option>

            <option>Websites & digital</option>

            <option>Social & content</option>

            <option>Performance & growth</option>

            <option>A connected programme</option>

          </select>

        </label>

        <label>

          Ideal timing

          <select name="timing" defaultValue="Let’s discuss">

            <option>Let’s discuss</option>

            <option>As soon as possible</option>

            <option>Within 1–3 months</option>

            <option>Within 3–6 months</option>

            <option>Planning ahead</option>

          </select>

        </label>

      </div>

      <label>

        Tell us a little about the project

        <textarea

          name="message"

          required

          minLength={10}

          maxLength={3000}

          rows={5}

          placeholder="What would you like to change, create or grow?"

        />

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

