import Image from "next/image";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import StatsBar from "@/components/StatsBar";
import ServiceCard from "@/components/ServiceCard";
import TestimonialSlider from "@/components/TestimonialSlider";
import CtaSection from "@/components/CtaSection";
import Reveal from "@/components/Reveal";
import Marquee from "@/components/Marquee";
import { services, faqs } from "@/lib/data";

const marqueeItems = [
  "Paid Media",
  "SEO",
  "Content & Creative",
  "Social Media",
  "Web Design & Development",
  "Brand Strategy",
];

const bentoItems = [
  {
    title: "Performance media",
    body: "Paid search, paid social and programmatic, planned around a target ROAS from day one.",
    span: "sm:col-span-2",
    accent: "from-navy to-navy/80",
  },
  {
    title: "Organic growth",
    body: "SEO and content built to compound — still working for you long after the campaign ends.",
    span: "",
    accent: "from-gold/90 to-gold/60",
  },
  {
    title: "Brand & strategy",
    body: "Positioning, messaging and media plans that make every channel pull in the same direction.",
    span: "",
    accent: "from-stone/90 to-stone/60",
  },
  {
    title: "Creative & content",
    body: "In-house video, photography and copy, produced for how people actually scroll.",
    span: "sm:col-span-2",
    accent: "from-navy/90 to-gold/40",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-gold/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-40 h-72 w-72 animate-float-slow-delayed rounded-full bg-navy/5 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-16 sm:pt-24 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-20 lg:pt-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-navy">
              Digital Media Agency &middot; London
            </span>
            <h1 className="mt-6 font-serif-brand text-4xl leading-[1.1] text-navy sm:text-5xl lg:text-[3.4rem]">
              Digital media that earns its place in your business.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy/70">
              Jova Media is a full-service digital media agency. We plan, create and manage the
              strategy, content and paid media that turn attention into revenue &mdash; and report
              on it honestly.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button href="/contact">Start a Project</Button>
              <Button href="/services" variant="outline">
                Explore Services
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-navy/60">
              <div className="flex -space-x-2">
                {["SW", "TA", "PN", "JO"].map((initials) => (
                  <span
                    key={initials}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ivory bg-navy text-xs font-semibold text-ivory"
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <p>Trusted by 120+ brands across the UK</p>
            </div>
          </Reveal>

          <Reveal delay={150} className="relative flex items-center justify-center">
            <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-navy/[0.03]" />
            <div className="w-full max-w-sm rounded-[2.5rem] border border-navy/10 bg-white p-10 shadow-xl shadow-navy/5 transition-transform duration-500 hover:-translate-y-1 sm:p-14">
              <Image
                src="/images/jova-icon.png"
                alt="Jova Media icon"
                width={640}
                height={633}
                className="mx-auto h-28 w-28 sm:h-32 sm:w-32"
                priority
              />
              <p className="mt-8 text-center font-serif-brand text-2xl text-navy">
                Your Digital Media Partner.
              </p>
              <p className="mt-3 text-center text-sm text-navy/60">
                Strategy &middot; Content &middot; Paid Media &middot; Web
              </p>
            </div>
          </Reveal>
        </div>

        <Marquee items={marqueeItems} />
      </section>

      <StatsBar />

      {/* Capabilities bento */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Where we play"
            title="Four disciplines. One growth engine."
            description="Each of these works as a standalone service — the compounding effect comes from running them together, under one strategy."
          />
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {bentoItems.map((item, i) => (
            <Reveal key={item.title} delay={i * 100} className={item.span}>
              <div
                className={`group relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${item.accent} p-8 text-ivory transition-transform duration-500 hover:-translate-y-1`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ivory/10 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                />
                <h3 className="font-serif-brand text-2xl">{item.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/80">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services overview */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <SectionHeading
              eyebrow="What we do"
              title="Every discipline a modern brand needs, under one roof."
              description="We don't hand you off between departments. One strategy, one team, working across every channel your audience is actually on."
            />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.slug} delay={(index % 3) * 100}>
                <ServiceCard index={index} {...service} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Jova */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <Reveal>
            <SectionHeading
              eyebrow="Why Jova Media"
              title="Built for brands who want a partner that acts like an owner."
              description="Most agencies optimise for the contract. We optimise for the result — because that's what keeps clients with us for years, not months."
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "One accountable team",
                body: "A single point of contact across strategy, creative, media and development.",
              },
              {
                title: "Reporting you can trust",
                body: "Live dashboards and monthly reviews that tell you what happened and why.",
              },
              {
                title: "No lock-in contracts",
                body: "Rolling monthly retainers. We keep clients because of results, not paperwork.",
              },
              {
                title: "Senior hands on the account",
                body: "Every account is led by a senior strategist, not handed to a junior after the pitch.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-navy/10 bg-white/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg hover:shadow-navy/5">
                  <h3 className="font-serif-brand text-xl text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy/65">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Client feedback"
              title="What it's like working with us."
            />
          </Reveal>
          <Reveal delay={150} className="mt-14">
            <TestimonialSlider />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-4xl px-6 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <SectionHeading align="center" eyebrow="FAQs" title="Good to know before we talk." />
          </Reveal>
          <Reveal delay={150} className="mt-12 divide-y divide-navy/10 border-y border-navy/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif-brand text-lg text-navy">
                  {faq.question}
                  <span className="text-gold transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-navy/65">{faq.answer}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
