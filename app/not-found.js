import Link from "next/link";
import Button from "@/components/Button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-32 text-center lg:px-8">
      <span className="font-serif-brand text-7xl text-gold">404</span>
      <h1 className="mt-4 font-serif-brand text-3xl text-navy">
        This page has wandered off-brand.
      </h1>
      <p className="mt-4 text-base text-navy/65">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. Let&rsquo;s get you
        back on track.
      </p>
      <div className="mt-8">
        <Button href="/">Back to Home</Button>
      </div>
      <p className="mt-6 text-sm text-navy/50">
        Or head straight to{" "}
        <Link href="/contact" className="underline underline-offset-2 hover:text-gold">
          contact us
        </Link>
        .
      </p>
    </section>
  );
}
