import ContactForm from "@/components/ContactForm";
import { siteConfig } from "@/lib/data";

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with Jova Media to talk about your next digital media project.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Contact Us
          </span>
          <h1 className="mt-4 font-serif-brand text-4xl leading-tight text-navy sm:text-5xl">
            Let&rsquo;s talk about your next move.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-navy/70">
            Whether you have a project in mind or just want a second opinion on your current
            marketing, drop us a message. A senior member of the team will reply within one
            working day.
          </p>

          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                Email
              </dt>
              <dd className="mt-1">
                <a href={`mailto:${siteConfig.email}`} className="text-navy hover:text-gold">
                  {siteConfig.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                Phone
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
                  className="text-navy hover:text-gold"
                >
                  {siteConfig.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                Studio
              </dt>
              <dd className="mt-1 text-navy">{siteConfig.address}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-navy/10 bg-white p-8 shadow-sm sm:p-10">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
