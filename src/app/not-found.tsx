import { defaultLocale, getDictionary, localeHtmlLang } from "@/i18n";

import "./globals.css";

/**
 * Global 404 for paths that never reached a locale segment. The root layout is
 * a pass-through, so this page renders its own document shell and falls back to
 * the default locale — a request this deep has no locale to read.
 */
export default function GlobalNotFound() {
  const d = getDictionary(defaultLocale);

  return (
    <html lang={localeHtmlLang[defaultLocale]} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col items-start justify-center px-4 py-20 sm:px-6 lg:px-10">
          <p className="eyebrow text-brand">{d.notFound.kicker}</p>
          <h1 className="section-title mt-5">{d.notFound.title}</h1>
          <p className="text-muted mt-6 max-w-md text-sm leading-6">
            {d.notFound.description}
          </p>
          <a
            className="bg-brand hover:bg-brand-strong mt-8 inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white transition-colors"
            href={`/${defaultLocale}`}
          >
            {d.common.home}
          </a>
        </main>
      </body>
    </html>
  );
}
