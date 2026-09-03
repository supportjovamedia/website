import Link from "next/link";

export default function ServiceCard({ title, short, slug, index }) {
  return (
    <Link
      href={`/services#${slug}`}
      className="group flex flex-col justify-between rounded-2xl border border-navy/10 bg-white/60 p-8 transition-all duration-200 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg hover:shadow-navy/5"
    >
      <div>
        <span className="font-serif-brand text-2xl text-gold">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-4 font-serif-brand text-2xl text-navy">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-navy/65">{short}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-navy transition-colors group-hover:text-gold">
        Learn more
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </Link>
  );
}
