import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`border-line placeholder:text-muted focus:border-brand min-h-12 w-full border bg-white px-4 text-base focus:outline-none ${className}`}
      {...props}
    />
  );
}
