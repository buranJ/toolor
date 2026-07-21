import Link from "next/link";

const links = [
  ["Обзор", "/account"],
  ["Заказы", "/account/orders"],
  ["Профиль", "/account/profile"],
  ["Адреса", "/account/addresses"],
] as const;

export function AccountNav() {
  return (
    <nav aria-label="Разделы аккаунта" className="border-line border-b">
      <ul className="flex gap-6 overflow-x-auto py-4 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link className="hover:text-brand whitespace-nowrap" href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
