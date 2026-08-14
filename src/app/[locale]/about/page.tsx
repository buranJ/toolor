import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { AppPromoSection } from "@/components/sections/app-promo-section";
import { BrandMark } from "@/components/ui/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MountainEdge } from "@/components/ui/mountain-edge";
import { RuneReveal } from "@/components/ui/rune-reveal";
import { ScrollRevealMark } from "@/components/ui/scroll-reveal-mark";
import {
  getDictionary,
  isLocale,
  localeAlternates,
  localePath,
  type Dictionary,
} from "@/i18n";
import { commerce } from "@/lib/commerce";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  return {
    title: d.meta.aboutTitle,
    description: d.meta.aboutDescription,
    alternates: {
      canonical: localePath(locale, "/about"),
      languages: localeAlternates("/about"),
    },
  };
}

function buildPrinciples(copy: Dictionary["pages"]["about"]["principles"]) {
  return [
    { title: copy.functionTitle, text: copy.functionText, tone: "blue" },
    { title: copy.designTitle, text: copy.designText, tone: "light" },
    { title: copy.characterTitle, text: copy.characterText, tone: "light" },
    { title: copy.durabilityTitle, text: copy.durabilityText, tone: "blue" },
  ];
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const copy = d.pages.about;
  const principles = buildPrinciples(copy.principles);

  const { items } = await commerce.getProducts({ pageSize: 100 });
  const withImages = [...items]
    .filter((product) => product.images.length > 0)
    .sort((a, b) => b.images.length - a.images.length);

  const heroImages = withImages[0]?.images ?? [];
  const statementImages =
    withImages.find((product) => product.gender === "men")?.images ??
    withImages[1]?.images ??
    heroImages;

  return (
    <>
      {/* Hero */}
      <section className="border-line bg-paper border-b">
        <Container className="pt-14 pb-12 md:pt-20 md:pb-16">
          <p className="eyebrow text-brand">{copy.kicker}</p>
          <h1 className="text-ink mt-6 max-w-4xl text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.3] font-medium tracking-[-0.02em] text-balance">
            {copy.title}
          </h1>
        </Container>
      </section>

      <Container className="bg-paper py-8 md:py-12">
        <div className="bg-frost-deep relative aspect-[16/10] overflow-hidden rounded-[2rem] shadow-[var(--shadow-soft)] md:aspect-[21/9]">
          <ResilientEditorialImage
            className="object-cover"
            images={heroImages}
            priority
            sizes="100vw"
            fallbackLabel="TOOLOR / Kyrgyzstan"
          />
        </div>
      </Container>

      {/* Philosophy */}
      <section className="bg-paper relative overflow-hidden py-16 md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 overflow-hidden lg:block"
        >
          <RuneReveal
            variant="grey"
            targetOpacity={0.8}
            className="absolute top-1/2 -left-24 w-[52rem] max-w-none -translate-y-1/2 rotate-3"
          />
        </div>
        <Container className="relative z-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <p className="eyebrow text-brand lg:pt-3">
              {copy.philosophyKicker}
            </p>
            <div>
              <h2 className="section-serif max-w-[18ch]">
                {copy.philosophyTitle}
              </h2>
              <div className="text-muted mt-6 max-w-2xl space-y-5 text-base leading-7">
                <p>{copy.philosophyP1}</p>
                <p>{copy.philosophyP2}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Principles */}
      <section className="relative overflow-hidden bg-white py-16 md:py-24">
        <ScrollRevealMark
          variant="grey"
          from="right"
          rotate={6}
          targetOpacity={0.32}
          className="absolute -top-6 -right-12 z-0 w-44 md:w-60"
        />
        <Container className="relative z-10">
          <p className="eyebrow text-brand">{copy.principlesKicker}</p>
          <h2 className="section-serif mt-4 max-w-[20ch]">
            {copy.principlesTitle}
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {principles.map((item) => {
              const isLight = item.tone === "light";
              const tone =
                item.tone === "blue"
                  ? "bg-brand text-white"
                  : "border-line bg-surface border";

              return (
                <div
                  key={item.title}
                  className={`group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[1.75rem] p-8 transition-transform duration-300 hover:-translate-y-1 ${tone}`}
                >
                  <BrandMark
                    variant={isLight ? "black" : "white"}
                    animate="none"
                    className={`absolute -right-12 -bottom-14 w-64 rotate-12 transition-transform duration-500 group-hover:rotate-6 ${
                      isLight ? "opacity-[0.05]" : "opacity-[0.14]"
                    }`}
                  />
                  <h3 className="headline-serif relative z-10 text-xl">
                    {item.title}
                  </h3>
                  <p
                    className={`relative z-10 mt-10 max-w-md text-sm leading-6 ${
                      isLight ? "text-muted" : "text-white/80"
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Cinematic statement */}
      <section className="bg-frost-deep relative overflow-hidden text-white">
        <ResilientEditorialImage
          className="object-cover opacity-55"
          images={statementImages}
          sizes="100vw"
          fallbackLabel="TOOLOR"
        />
        <div className="frost-scrim absolute inset-0" />
        <MountainEdge position="top" className="text-white" />
        <MountainEdge position="bottom" className="text-paper" />
        <ScrollRevealMark
          variant="white"
          from="right"
          rotate={8}
          targetOpacity={0.5}
          className="absolute -right-8 bottom-14 z-2 w-56 md:w-80"
        />
        <Container className="relative z-[3] py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="eyebrow text-white/75">{copy.statementKicker}</p>
            <h2 className="mt-6 font-serif text-[clamp(2.25rem,5.5vw,5rem)] leading-[1.05] font-medium text-balance">
              {copy.statementTitleLead}{" "}
              <span className="serif-italic">{copy.statementTitleAccent}</span>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-white/85">
              {copy.statementText}
            </p>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-paper py-16 md:py-24 lg:py-28">
        <Container>
          <div className="bg-brand relative overflow-hidden rounded-[2rem] px-8 py-14 text-center text-white md:px-12 md:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <BrandMark
                variant="white"
                animate="none"
                className="absolute top-1/2 right-0 w-[46rem] max-w-none translate-x-1/5 -translate-y-1/2 rotate-6 opacity-[0.12]"
              />
              <BrandMark
                variant="white"
                animate="none"
                className="absolute top-1/2 left-0 w-[30rem] max-w-none -translate-x-1/3 -translate-y-1/2 -rotate-3 opacity-[0.08]"
              />
            </div>

            <div className="relative z-10">
              <h2 className="font-serif text-[clamp(1.9rem,4vw,3.25rem)] leading-tight font-medium">
                {copy.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-white/80">
                {copy.ctaText}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <ButtonLink
                  href={localePath(locale, "/catalog")}
                  variant="light-solid"
                  size="lg"
                >
                  {d.common.viewCatalog}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <AppPromoSection locale={locale} />
    </>
  );
}
