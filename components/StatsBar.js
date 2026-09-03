"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/lib/data";

// Splits a value like "£18M+" into a numeric part to animate (18) plus the
// prefix/suffix characters to keep static ("£" and "M+").
function parseStat(value) {
  const match = value.match(/^([^\d]*)(\d+(?:\.\d+)?)([^\d]*)$/);
  if (!match) return { prefix: "", number: null, suffix: value };
  const [, prefix, number, suffix] = match;
  return { prefix, number: parseFloat(number), suffix };
}

function AnimatedNumber({ value }) {
  const { prefix, number, suffix } = parseStat(value);
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (number === null) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const start = performance.now();

          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(number * eased);
            if (progress < 1) requestAnimationFrame(tick);
            else setDisplay(number);
          };

          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [number]);

  if (number === null) {
    return <span ref={ref}>{suffix}</span>;
  }

  const rounded = Number.isInteger(number) ? Math.round(display) : display.toFixed(1);

  return (
    <span ref={ref}>
      {prefix}
      {rounded}
      {suffix}
    </span>
  );
}

export default function StatsBar() {
  return (
    <section className="border-y border-navy/10 bg-navy">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4 lg:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-serif-brand text-3xl text-gold sm:text-4xl">
              <AnimatedNumber value={stat.value} />
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.15em] text-ivory/70 sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
