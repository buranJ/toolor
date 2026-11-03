import { cookies } from "next/headers";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { adminConfigured, adminCookie, isAdminSession } from "@/features/admin/auth";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookie = (await cookies()).get(adminCookie.name)?.value;
  return (
    <AdminDashboard
      copy={getDictionary("ru").admin}
      configured={adminConfigured()}
      initiallyAuthenticated={isAdminSession(cookie)}
    />
  );
}
