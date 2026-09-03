import Link from "next/link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors duration-200";

const variants = {
  primary: "bg-navy text-ivory hover:bg-gold hover:text-navy",
  gold: "bg-gold text-navy hover:bg-navy hover:text-ivory",
  outline: "border border-navy/25 text-navy hover:border-navy hover:bg-navy hover:text-ivory",
  outlineLight: "border border-ivory/40 text-ivory hover:bg-ivory hover:text-navy",
};

export default function Button({ href, variant = "primary", children, className = "", ...props }) {
  const classes = `${base} ${variants[variant] ?? variants.primary} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
