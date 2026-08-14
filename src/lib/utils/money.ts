import type { Locale } from "@/i18n/config";
import type { Money } from "@/types";

/**
 * Fallback formatting locale when no UI locale is supplied — matches the
 * currency's home market.
 */
const localeByCurrency: Record<Money["currencyCode"], string> = {
  KGS: "ru-KG",
  USD: "en-US",
};

/**
 * Formatting locale per UI locale, deliberately separate from `localeIntl`.
 *
 * Kyrgyz maps to `ru-KG`: Node ships full ICU and renders KGS as "сом" under
 * `ky-KG`, while browsers lack that currency data and fall back to the "KGS"
 * code — the two disagree and React fails hydration. `ru-KG` is present
 * everywhere, uses the same space grouping, and yields the same "сом" the
 * Kyrgyz page should show anyway.
 */
const MONEY_LOCALE: Record<Locale, string> = {
  ru: "ru-KG",
  en: "en-US",
  ky: "ru-KG",
};

/**
 * Format a price for display. Amounts are stored in minor units.
 *
 * The price itself is product data, but grouping separators, digit order and
 * the currency's placement are interface conventions — so when the caller knows
 * the active locale it drives the formatting.
 */
export function formatMoney(money: Money, locale?: Locale): string {
  const formattingLocale = locale
    ? MONEY_LOCALE[locale]
    : localeByCurrency[money.currencyCode];

  return new Intl.NumberFormat(formattingLocale, {
    style: "currency",
    currency: money.currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(money.amount / 100);
}
