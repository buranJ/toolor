export const APP_STORES = [
  {
    name: "Google Play",
    eyebrow: "Доступно в",
    href: "https://play.google.com/store/apps/details?id=com.toolor.toolor_app&pcampaignid=web_share",
    qr: "/qr/play.png",
    qrSize: 756,
    icon: "play",
  },
  {
    name: "App Store",
    eyebrow: "Загрузите в",
    href: "https://apps.apple.com/kg/app/toolor/id6761310984",
    qr: "/qr/app.png",
    qrSize: 612,
    icon: "apple",
  },
] as const;

export function StoreIcon({ kind }: { kind: "play" | "apple" }) {
  if (kind === "play") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4.4 3.2 14.8 12 4.4 20.8c-.25-.35-.4-.78-.4-1.25V4.45c0-.47.15-.9.4-1.25Z" />
        <path d="m15.15 11.7 2.7-2.28L6.9 3.35l8.25 8.35Z" opacity=".72" />
        <path d="m15.15 12.3-8.25 8.35 10.95-6.07-2.7-2.28Z" opacity=".48" />
        <path d="m15.45 12 2.75-2.32 1.25.69c.73.4.73.86 0 1.26l-1.25.69L15.45 12Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M16.86 12.62c.02-2.04 1.67-3.02 1.74-3.07a3.74 3.74 0 0 0-2.95-1.6c-1.24-.13-2.45.74-3.08.74-.64 0-1.61-.73-2.66-.7a3.9 3.9 0 0 0-3.29 2c-1.42 2.46-.36 6.07 1 8.06.68.97 1.47 2.04 2.52 2 1.03-.04 1.42-.64 2.66-.64 1.23 0 1.6.64 2.67.62 1.1-.02 1.8-.98 2.45-1.95a8.1 8.1 0 0 0 1.12-2.28 3.53 3.53 0 0 1-2.18-3.18ZM14.84 6.64a3.55 3.55 0 0 0 .81-2.56 3.61 3.61 0 0 0-2.34 1.22 3.4 3.4 0 0 0-.84 2.46 3 3 0 0 0 2.37-1.12Z" />
    </svg>
  );
}
