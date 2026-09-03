import { stats } from "@/lib/data";

export default function StatsBar() {
  return (
    <section className="border-y border-navy/10 bg-navy">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4 lg:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-serif-brand text-3xl text-gold sm:text-4xl">{stat.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.15em] text-ivory/70 sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
