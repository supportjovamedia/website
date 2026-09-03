export default function Marquee({ items }) {
  // Rendered twice back-to-back so the CSS animation can loop seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="group relative overflow-hidden border-y border-navy/10 bg-white/60 py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ivory to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ivory to-transparent"
      />
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-navy/50"
          >
            {item}
            <span className="text-gold" aria-hidden="true">
              &#9670;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
