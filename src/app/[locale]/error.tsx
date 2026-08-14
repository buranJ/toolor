"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const raw = typeof params?.locale === "string" ? params.locale : undefined;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const d = getDictionary(locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[65vh] flex-col items-start justify-center py-20">
      <p className="eyebrow text-brand">{d.error.kicker}</p>
      <h1 className="section-title mt-5">{d.error.title}</h1>
      <p className="text-muted mt-6 text-sm">{d.error.description}</p>
      <Button className="mt-8" onClick={reset}>
        {d.error.retry}
      </Button>
    </Container>
  );
}
