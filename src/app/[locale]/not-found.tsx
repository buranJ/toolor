import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { defaultLocale, getDictionary, localePath } from "@/i18n";

/**
 * Locale-segment 404. `notFound()` unwinds past the `[locale]` params, so this
 * boundary cannot read the active locale and renders in the default one; the
 * surrounding layout still supplies the correct `<html lang>`.
 */
export default function NotFound() {
  const d = getDictionary(defaultLocale);

  return (
    <Container className="flex min-h-[65vh] flex-col items-start justify-center py-20">
      <p className="eyebrow text-brand">{d.notFound.kicker}</p>
      <h1 className="section-title mt-5">{d.notFound.title}</h1>
      <p className="text-muted mt-6 max-w-md text-sm leading-6">
        {d.notFound.description}
      </p>
      <ButtonLink className="mt-8" href={localePath(defaultLocale, "/")}>
        {d.common.home}
      </ButtonLink>
    </Container>
  );
}
