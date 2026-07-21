import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[65vh] flex-col items-start justify-center py-20">
      <p className="eyebrow text-brand">404 / Route not found</p>
      <h1 className="section-title mt-5">Маршрут не найден.</h1>
      <p className="text-muted mt-6 max-w-md text-sm leading-6">
        Возможно, страница перемещена или ещё не создана.
      </p>
      <ButtonLink className="mt-8" href="/">
        На главную
      </ButtonLink>
    </Container>
  );
}
