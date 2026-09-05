"use client";
import { useRef, useState } from "react";
import { contactEmail } from "@/lib/site";
export default function ContactForm() {
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState("");
  const result = useRef(null);
  function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const subject = `Project enquiry${values.company ? " — " + values.company : ""}`;
    const body = `Hello JovaMedia,\n\n${values.message}\n\nName: ${values.name}\nEmail: ${values.email}\nCompany: ${values.company || "Not provided"}\nInterested in: ${values.service}\nTiming: ${values.timing}\n\nSent from the JovaMedia project enquiry form.`;
    setDraft({ subject, body });
    setCopied("");
    requestAnimationFrame(() => result.current?.focus());
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `To: ${contactEmail}\nSubject: ${draft.subject}\n\n${draft.body}`,
      );
      setCopied("Brief copied. Paste it into your email.");
    } catch {
      setCopied("Copy is unavailable here. Select and copy the brief below.");
    }
  }
  return (
    <form
      className="form"
      onSubmit={submit}
      onChange={() => {
        if (draft) setDraft(null);
      }}
    >
      <div>
        <p className="kicker">Your project</p>
        <h2 style={{ fontSize: 28 }}>What do you have in mind?</h2>
      </div>
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
      <p className="form-note">
        We’ll prepare your enquiry for you to review and send from your email
        app. Nothing is sent until you choose to send it.
      </p>
      <button type="submit" className="btn blue">
        Review my enquiry
      </button>
      {draft && (
        <section
          ref={result}
          tabIndex={-1}
          className="form-status"
          aria-label="Enquiry ready to review"
        >
          <h3 style={{ fontSize: 22, marginBottom: 12 }}>
            Your brief is ready.
          </h3>
          <p>
            Send it to {contactEmail} using your email app, or copy the brief.
            This website has not sent your enquiry.
          </p>
          <textarea
            aria-label="Your prepared enquiry"
            readOnly
            value={draft.body}
            rows={7}
          />
          <div className="actions">
            <a
              className="btn"
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
            >
              Open email draft
            </a>
            <button type="button" className="btn outline" onClick={copy}>
              Copy brief
            </button>
          </div>
          <p role="status" style={{ marginTop: 12 }}>
            {copied}
          </p>
        </section>
      )}
      <p className="form-note">
        By emailing us, you share the details in your message so we can respond.
        Read our{" "}
        <a
          className="text-link"
          href="/privacy-policy"
          style={{ fontSize: "inherit" }}
        >
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
