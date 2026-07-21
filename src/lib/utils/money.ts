import type { Money } from "@/types";

const localeByCurrency: Record<Money["currencyCode"], string> = {
  KGS: "ru-KG",
  USD: "en-US",
};

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(localeByCurrency[money.currencyCode], {
    style: "currency",
    currency: money.currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(money.amount / 100);
}
