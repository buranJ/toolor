import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";

export function ContentPage({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader kicker={kicker} title={title} description={description} />
      <Container className="py-14 md:py-24">
        <div className="text-muted max-w-3xl space-y-8 text-base leading-7">
          {children}
        </div>
      </Container>
    </>
  );
}
