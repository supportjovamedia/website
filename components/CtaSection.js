import Button from "@/components/Button";

export default function CtaSection({
  title = "Ready to grow with a partner, not just a provider?",
  description = "Tell us where you're at and where you want to be — we'll come back with a straightforward view on how to get there.",
  buttonLabel = "Start a Project",
  buttonHref = "/contact",
}) {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
        <h2 className="font-serif-brand text-3xl text-ivory sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-ivory/70">{description}</p>
        <div className="mt-8">
          <Button href={buttonHref} variant="gold">
            {buttonLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
