import Button from "@/components/Button";
import Reveal from "@/components/Reveal";

export default function CtaSection({
  title = "Ready to grow with a partner, not just a provider?",
  description = "Tell us where you're at and where you want to be — we'll come back with a straightforward view on how to get there.",
  buttonLabel = "Start a Project",
  buttonHref = "/contact",
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 animate-float-slow rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <h2 className="font-serif-brand text-3xl text-ivory sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ivory/70">{description}</p>
          <div className="mt-8">
            <Button href={buttonHref} variant="gold">
              {buttonLabel}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
