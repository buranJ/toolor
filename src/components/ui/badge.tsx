import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-current px-2 py-1 text-[0.625rem] font-semibold tracking-[0.12em] uppercase">
      {children}
    </span>
  );
}
