/**
 * Pass-through root layout.
 *
 * Every real route lives under `app/[locale]`, and `<html lang>` has to reflect
 * the active locale — which a root layout cannot read, since it receives no
 * route params. So the document shell is rendered by `app/[locale]/layout.tsx`
 * and this file only forwards its children. The global 404 in
 * `app/not-found.tsx` renders its own shell for the same reason.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
