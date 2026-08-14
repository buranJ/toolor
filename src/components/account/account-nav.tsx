import Link from "next/link";

import {
  getDictionary,
  localePath,
  type Dictionary,
  type Locale,
} from "@/i18n";

const links = [
  { href: "/account", key: "overview" },
  { href: "/account/orders", key: "orders" },
  { href: "/account/profile", key: "profile" },
  { href: "/account/addresses", key: "addresses" },
] as const satisfies ReadonlyArray<{
  href: string;
  key: keyof Dictionary["account"];
}>;

export function AccountNav({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);

  return (
    <nav aria-label={d.account.navAria} className="border-line border-b">
      <ul className="flex gap-6 overflow-x-auto py-4 text-sm">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              className="hover:text-brand whitespace-nowrap"
              href={localePath(locale, item.href)}
            >
              {d.account[item.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
