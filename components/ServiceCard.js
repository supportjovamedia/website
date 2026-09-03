import Link from "next/link";

export default function ServiceCard({ title, short, slug, index }) {
  return (
    <Link
      href={`/services#${slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-navy/10 bg-white/60 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-2xl hover:shadow-navy/10"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-gold/0 via-gold/0 to-navy/0 opacity-0 transition-opacity duration-500 group-hover:from-gold/10 group-hover:via-transparent group-hover:to-navy/5 group-hover:opacity-100"
      />
      <div>
        <span className="font-serif-brand text-2xl text-gold transition-transform duration-300 group-hover:scale-110 group-hover:text-navy inline-block">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-4 font-serif-brand text-2xl text-navy">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-navy/65">{short}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-navy transition-colors group-hover:text-gold">
        Learn more
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
          &rarr;
        </span>
      </span>
    </Link>
  );
}
