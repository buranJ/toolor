import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "group/btn inline-flex items-center justify-center gap-2.5 rounded-full font-medium tracking-[0.01em] transition-all duration-200";

const sizes = {
  md: "min-h-11 px-6 py-3 text-sm",
  lg: "min-h-[3.4rem] px-8 py-4 text-[0.95rem]",
} as const;

const variants = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-[var(--shadow-soft)]",
  accent: "bg-brand text-white hover:bg-brand-strong shadow-[var(--shadow-soft)]",
  secondary: "border border-ink/85 bg-transparent text-ink hover:bg-ink hover:text-white",
  light: "border border-white/70 bg-transparent text-white hover:bg-white hover:text-ink",
  "light-solid": "bg-white text-ink hover:bg-paper shadow-[var(--shadow-soft)]",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  external = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Render as a plain external anchor that opens in a new tab. */
  external?: boolean;
  /** Deprecated — button arrows removed for a cleaner look. */
  arrow?: boolean;
  className?: string;
}) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (external) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  );
}

export function Button({
  className = "",
  type = "button",
  variant = "accent",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    />
  );
}
