import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";

export function PageHeader({
  kicker,
  title,
  description,
  aside,
  compact = false,
}: {
  kicker: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header
      className={`border-line border-b ${compact ? "pt-12 pb-8 md:pt-16 md:pb-10" : "pt-14 pb-12 md:pt-24 md:pb-16"}`}
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-brand">{kicker}</p>
            <h1 className="section-serif mt-5 max-w-[16ch]">{title}</h1>
          </div>
          <div className="lg:pb-2">
            <div className="text-muted max-w-md text-sm leading-relaxed">
              {description}
            </div>
            {aside}
          </div>
        </div>
      </Container>
    </header>
  );
}
