import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

export function TextLink({
  children,
  className = "",
  ...props
}: LinkProps & { children: ReactNode; className?: string }) {
  return (
    <Link
      className={`group/link inline-flex items-center gap-2 text-sm font-medium ${className}`}
      {...props}
    >
      <span className="link-underline pb-0.5">{children}</span>
      <span
        aria-hidden="true"
        className="grid size-5 place-items-center rounded-full border border-current text-[0.65rem] transition-transform duration-200 group-hover/link:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
