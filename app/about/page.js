import SectionHeading from "@/components/SectionHeading";
import CtaSection from "@/components/CtaSection";
import StatsBar from "@/components/StatsBar";
import { teamValues, teamMembers } from "@/lib/data";

export const metadata = {
  title: "About Us",
  description:
    "Jova Media is a London-based digital media agency built on straight talk, strategy and long-term partnerships.",
};

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 lg:px-8 lg:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          About Jova Media
        </span>
        <h1 className="mt-4 max-w-3xl font-serif-brand text-4xl leading-tight text-navy sm:text-5xl">
          We started Jova Media because too many agencies talk a good game and deliver a slow one.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy/70">
          Founded in London, Jova Media brings strategy, content and paid media together under one
          roof so nothing gets lost in translation between departments, freelancers or vendors.
          We work as an extension of our clients&rsquo; teams &mdash; close enough to move fast,
          senior enough to be trusted with the decisions that matter.
        </p>
      </section>

      <StatsBar />

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="From a two-person team to a full-service partner." />
            <p className="mt-6 text-base leading-relaxed text-navy/70">
              Jova Media began as a small paid media consultancy, running campaigns for a handful
              of independent brands who couldn&rsquo;t get a straight answer from their existing
              agencies. Word spread, the client list grew, and so did the team &mdash; adding
              content, SEO, brand strategy and web development as clients asked us to take on
              more of their growth.
            </p>
            <p className="mt-4 text-base leading-relaxed text-navy/70">
              Today we work with businesses across retail, professional services, hospitality and
              healthcare, but the way we operate hasn&rsquo;t changed: senior people on every
              account, clear reporting, and a strategy behind every piece of work we produce.
            </p>
          </div>
          <div>
            <SectionHeading eyebrow="Our mission" title="Make digital media accountable again." />
            <p className="mt-6 text-base leading-relaxed text-navy/70">
              Digital media has a trust problem &mdash; too many reports built to look good rather
              than explain what happened. Our mission is simple: plan properly, execute well, and
              report honestly, so every client knows exactly what their budget is doing and why.
            </p>
            <p className="mt-4 text-base leading-relaxed text-navy/70">
              We measure our own success the same way we ask clients to measure us: by results
              that show up in the business, not just in a dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <SectionHeading
            align="center"
            eyebrow="How we work"
            title="The principles behind every account."
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teamValues.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-navy/10 bg-ivory p-6 text-center"
              >
                <h3 className="font-serif-brand text-xl text-navy">{value.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy/65">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <SectionHeading eyebrow="The team" title="The people behind the work." />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="flex items-center gap-4 rounded-2xl border border-navy/10 p-5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy font-serif-brand text-lg text-gold">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <div>
                <p className="font-medium text-navy">{member.name}</p>
                <p className="text-sm text-navy/60">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaSection
        title="Like the sound of how we work?"
        description="Let's talk about where your brand is today and what growing it properly would look like."
      />
    </>
  );
}
