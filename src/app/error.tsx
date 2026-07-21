"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="flex min-h-[65vh] flex-col items-start justify-center py-20">
      <p className="eyebrow text-brand">Unexpected error</p>
      <h1 className="section-title mt-5">Что-то пошло не так.</h1>
      <p className="text-muted mt-6 text-sm">Попробуйте повторить действие.</p>
      <Button className="mt-8" onClick={reset}>
        Повторить
      </Button>
    </Container>
  );
}
