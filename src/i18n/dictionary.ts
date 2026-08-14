import { defaultLocale, localeIntl, type Locale } from "./config";
import en from "./messages/en.json";
import ky from "./messages/ky.json";
import ru from "./messages/ru.json";

/**
 * Russian is the source dictionary: its shape defines the contract every other
 * locale must satisfy. A missing or renamed key in `en`/`ky` is a type error,
 * so translations cannot silently drift out of sync with the interface.
 */
export type Dictionary = typeof ru;

const dictionaries: Record<Locale, Dictionary> = {
  ru,
  en: en satisfies Dictionary,
  ky: ky satisfies Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/**
 * Replace `{name}` placeholders in a message.
 *
 *   format(d.footer.rights, { year: 2026 })  // "© 2026 TOOLOR. …"
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

type PluralForms = {
  one: string;
  few: string;
  many: string;
  other: string;
};

/**
 * Pick the plural form for `count` using the locale's own CLDR rules — Russian
 * needs one/few/many, English only one/other, Kyrgyz keeps a single form.
 */
export function plural(
  locale: Locale,
  count: number,
  forms: PluralForms,
): string {
  const category = new Intl.PluralRules(localeIntl[locale]).select(count);
  return forms[category as keyof PluralForms] ?? forms.other;
}

/** Format a number using the active locale's conventions. */
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(localeIntl[locale]).format(value);
}
