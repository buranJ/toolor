import { Container } from "@/components/ui/container";
import { ScrollRevealMark } from "@/components/ui/scroll-reveal-mark";
import { reviews } from "@/data/reviews";
import type { Review } from "@/data/reviews";

function Stars({ tone = "brand" }: { tone?: "brand" | "white" }) {
  const color = tone === "white" ? "#ffffff" : "var(--brand-blue)";
  return (
    <span className="flex gap-1" role="img" aria-label="Оценка 5 из 5">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          className="size-[1.05rem]"
          viewBox="0 0 24 24"
          fill={color}
          stroke={color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        >
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 17.77l-5.2 2.75.99-5.8-4.21-4.1 5.82-.85z" />
        </svg>
      ))}
    </span>
  );
}

function Avatar({
  initials,
  tone = "brand",
}: {
  initials: string;
  tone?: "brand" | "white";
}) {
  const cls =
    tone === "white"
      ? "bg-white/15 text-white ring-1 ring-white/40"
      : "bg-brand text-white";
  return (
    <span
      aria-hidden="true"
      className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${cls}`}
    >
      {initials}
    </span>
  );
}

function FeaturedReview({ review }: { review: Review }) {
  return (
    <article className="bg-brand relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-8 text-white shadow-[var(--shadow-soft)] md:col-span-2 md:p-10 lg:row-span-2">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 right-6 font-serif text-[10rem] leading-none text-white/12"
      >
        &rdquo;
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative">
        <Stars tone="white" />
        <blockquote className="mt-6 font-serif text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[1.2] text-balance">
          {review.quote}
        </blockquote>
      </div>
      <figcaption className="relative mt-10 flex items-center gap-3">
        <Avatar initials={review.initials} tone="white" />
        <span>
          <span className="block text-sm font-semibold">{review.name}</span>
          <span className="block text-xs text-white/70">
            {review.city} · {review.context}
          </span>
        </span>
      </figcaption>
    </article>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="group border-line bg-surface relative flex flex-col overflow-hidden rounded-[2rem] border p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-card)]">
      <Stars />
      <blockquote className="text-ink mt-4 flex-1 text-[0.95rem] leading-relaxed">
        {review.quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <Avatar initials={review.initials} />
        <span>
          <span className="text-ink block text-sm font-semibold">
            {review.name}
          </span>
          <span className="text-muted block text-xs">
            {review.city} · {review.context}
          </span>
        </span>
      </figcaption>
    </article>
  );
}

export function ReviewsSection() {
  const [featured, ...rest] = reviews;

  return (
    <section
      className="bg-surface relative overflow-hidden py-20 md:py-28"
      data-scroll-anchor="reviews"
    >
      <ScrollRevealMark
        variant="grey"
        from="right"
        rotate={6}
        targetOpacity={0.4}
        className="absolute -top-8 -right-12 z-0 w-48 md:w-64"
      />
      <Container className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
       
            <h2 className="section-serif mt-4">Отзывы </h2>
          </div>
          
        </div>

        <div className="mt-12 grid gap-5 md:mt-14 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr">
          {featured ? <FeaturedReview review={featured} /> : null}
          {rest.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>
      </Container>
    </section>
  );
}
