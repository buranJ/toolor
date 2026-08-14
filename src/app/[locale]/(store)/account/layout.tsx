import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Container } from "@/components/ui/container";
import { getDictionary, isLocale } from "@/i18n";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  return (
    <Container className="py-10 md:py-16">
      <p className="eyebrow text-brand">{d.account.kicker}</p>
      <h1 className="mt-4 text-4xl font-medium tracking-[-0.05em] md:text-6xl">
        {d.account.title}
      </h1>
      <p className="text-muted mt-4 max-w-xl text-sm leading-6">
        {d.account.intro}
      </p>
      <div className="mt-10">
        <AccountNav locale={locale} />
      </div>
      <div className="py-10">{children}</div>
    </Container>
  );
}
