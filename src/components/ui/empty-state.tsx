import type { ReactNode } from "react";

import { ButtonLink } from "./button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-[1.5rem] bg-white px-6 py-16 text-center shadow-[var(--shadow-soft)] md:py-24">
      <p className="eyebrow text-brand">Пока пусто</p>
      <h2 className="section-serif mt-4 text-3xl">{title}</h2>
      <div className="text-muted mx-auto mt-4 max-w-lg text-sm leading-6">
        {description}
      </div>
      {action ? (
        <ButtonLink className="mt-8" href={action.href}>
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
