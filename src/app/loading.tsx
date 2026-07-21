import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-16">
      <span className="sr-only">Загрузка</span>
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
