"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { testimonials } from "@/lib/data";

const AUTOPLAY_MS = 6000;

export default function TestimonialSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = testimonials.length;
  const timerRef = useRef(null);

  const go = useCallback(
    (dir) => {
      setIndex((current) => (current + dir + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, go]);

  const current = testimonials[index];

  return (
    <div
      className="mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-3xl border border-navy/10 bg-white px-8 py-12 text-center shadow-sm sm:px-14 sm:py-16">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
        />
        <div key={index} className="relative animate-[fadeIn_0.6s_ease]">
          <span
            className="font-serif-brand text-6xl leading-none text-gold"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <p className="mx-auto -mt-4 max-w-2xl font-serif-brand text-xl leading-relaxed text-navy sm:text-2xl">
            {current.quote}
          </p>
          <div className="mt-8">
            <p className="text-sm font-semibold tracking-wide text-navy">
              {current.name}
            </p>
            <p className="text-sm text-navy/60">{current.role}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous testimonial"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/15 text-navy transition-colors hover:border-gold hover:text-gold"
        >
          &larr;
        </button>

        <div className="flex gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-gold" : "bg-navy/20"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next testimonial"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/15 text-navy transition-colors hover:border-gold hover:text-gold"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}
