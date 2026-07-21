import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Адреса",
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <EmptyState
      title="Адресов нет"
      description="Адресная книга будет добавлена после согласования checkout flow и требований к персональным данным."
    />
  );
}
