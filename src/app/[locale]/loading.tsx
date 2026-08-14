import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultLocale, getDictionary } from "@/i18n";

export default function Loading() {
  // Loading boundaries render before params resolve, so the screen-reader hint
  // uses the default locale.
  const d = getDictionary(defaultLocale);

  return (
    <Container className="py-16">
      <span className="sr-only">{d.loading.label}</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-6 h-24 max-w-3xl" />
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="aspect-[4/5]" key={index} />
        ))}
      </div>
    </Container>
  );
}
