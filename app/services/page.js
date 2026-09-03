import SectionHeading from "@/components/SectionHeading";
import CtaSection from "@/components/CtaSection";
import { services } from "@/lib/data";

export const metadata = {
  title: "Services",
  description:
    "Paid media, SEO, content & creative, social media management, web design & development and brand strategy from Jova Media.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 lg:px-8 lg:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Services
        </span>
        <h1 className="mt-4 max-w-3xl font-serif-brand text-4xl leading-tight text-navy sm:text-5xl">
          Every service works on its own. They work best together.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy/70">
          Whether you need one channel fixed or a full growth engine built, our team plans,
          produces and manages the work &mdash; then reports on it in a way that actually makes
          sense.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {services.map((service, index) => (
            <div
              key={service.slug}
              id={service.slug}
              className="grid scroll-mt-24 grid-cols-1 gap-8 py-14 lg:grid-cols-12 lg:gap-12"
            >
              <div className="lg:col-span-4">
                <span className="font-serif-brand text-3xl text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-serif-brand text-3xl text-navy">{service.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-navy/65">{service.description}</p>
              </div>
              <div className="lg:col-span-8">
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {service.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 text-sm text-navy/75"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <SectionHeading
            align="center"
            eyebrow="How we start"
            title="A simple process, no jargon."
          />
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Discovery call",
                body: "We learn about your business, your audience and what growth actually needs to look like.",
              },
              {
                step: "02",
                title: "Strategy & proposal",
                body: "You get a clear plan, timeline and cost — no vague scopes or hidden extras.",
              },
              {
                step: "03",
                title: "Onboarding",
                body: "Access, brand assets and a kickoff session so everyone starts from the same page.",
              },
              {
                step: "04",
                title: "Delivery & reporting",
                body: "Work goes live, gets tested, and gets reported on honestly every month.",
              },
            ].map((item) => (
              <div key={item.step}>
                <span className="font-serif-brand text-3xl text-gold">{item.step}</span>
                <h3 className="mt-3 font-serif-brand text-xl text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/65">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Not sure which service is right for you?"
        description="Tell us what you're trying to achieve and we'll recommend where to start — no obligation."
      />
    </>
  );
}
