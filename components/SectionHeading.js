export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
}) {
  const alignClass =
    align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`flex flex-col ${alignClass}`}>
      {eyebrow && (
        <span
          className={`text-xs font-semibold uppercase tracking-[0.25em] ${
            light ? "text-gold" : "text-gold"
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`mt-3 font-serif-brand text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight ${
          light ? "text-ivory" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 max-w-2xl text-base leading-relaxed ${
            light ? "text-ivory/75" : "text-navy/70"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
