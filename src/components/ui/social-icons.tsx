import type { ReactNode } from "react";

import { socialLinks } from "@/lib/config/social";

type Social = {
  label: string;
  href: string;
  filled: boolean;
  path: ReactNode;
};

const LINKS: Social[] = [
  {
    label: "Instagram",
    href: socialLinks.instagram,
    filled: false,
    path: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "TikTok",
    href: socialLinks.tiktok,
    filled: true,
    path: (
      <path d="M13.2 2h2.6c.2 1.6 1.1 3 2.5 3.7.7.4 1.5.6 2.3.6v2.7c-1.6 0-3.1-.5-4.4-1.4v6.6a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.8a3.1 3.1 0 1 0 2.1 2.9V2Z" />
    ),
  },
  {
    label: "WhatsApp",
    href: socialLinks.whatsapp,
    filled: true,
    path: (
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.3 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .3-3.4-.7-2.9-1.2-4.7-4.1-4.8-4.3-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.2.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4 0 .5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.2.1.9-.1 1.5Z" />
    ),
  },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {LINKS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          aria-label={item.label}
          rel="noreferrer"
          target="_blank"
          className="grid size-10 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-white hover:bg-white hover:text-ink"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[1.15rem]"
            fill={item.filled ? "currentColor" : "none"}
            stroke={item.filled ? "none" : "currentColor"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {item.path}
          </svg>
        </a>
      ))}
    </div>
  );
}
