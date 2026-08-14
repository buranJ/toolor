/**
 * Locale contract for the storefront.
 *
 * Product records imported from the workbook stay in their source language —
 * only interface copy, editorial sections and metadata are translated. Brand
 * names ("TOOLOR", "Modern nomads") are deliberately never localised.
 */

export const locales = ["ru", "en", "ky"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

/** Native label shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  ky: "Кыргызча",
};

/** Short label for the compact switcher. */
export const localeShortNames: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
  ky: "KG",
};

/** BCP 47 tag for the `<html lang>` attribute. */
export const localeHtmlLang: Record<Locale, string> = {
  ru: "ru",
  en: "en",
  ky: "ky",
};

/** Open Graph `locale` value. */
export const localeOpenGraph: Record<Locale, string> = {
  ru: "ru_KG",
  en: "en_US",
  ky: "ky_KG",
};

/** `Intl` locale used for number, currency and date formatting. */
export const localeIntl: Record<Locale, string> = {
  ru: "ru-KG",
  en: "en-US",
  ky: "ky-KG",
};

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
