import type { Metadata } from "next";

import "../globals.css";

export const metadata: Metadata = {
  title: "TOOLOR — Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#f4f6f8] font-sans text-[#161b21] antialiased">
        {children}
      </body>
    </html>
  );
}
