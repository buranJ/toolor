import { notFound } from "next/navigation";

import { HeroLab } from "@/components/sections/hero/hero-lab";
import { isLocale } from "@/i18n";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Side-by-side bench for the two hero techniques. Not linked from anywhere and
 * marked noindex — it exists so the scroll can be compared on a real phone
 * rather than only in a throttled desktop browser.
 */
export default async function HeroLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HeroLab />;
}
