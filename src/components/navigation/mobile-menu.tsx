"use client";

import Link from "next/link";
import { useRef } from "react";

import { siteConfig } from "@/lib/config/site";

export function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        aria-label="Открыть меню"
        className="mobile-menu-trigger"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <span>Меню</span>
        <span aria-hidden="true" className="mobile-menu-trigger-lines">
          <i />
          <i />
        </span>
      </button>
      <dialog className="menu-dialog" data-testid="mobile-menu" ref={dialogRef}>
        <div className="mobile-menu-panel">
          <div aria-hidden="true" className="mobile-menu-orbit" />
          <header className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[1.7rem] font-bold tracking-[-0.08em]">
                TOOLOR<span className="text-[#739cff]">/</span>
              </span>
              <p className="mt-1.5 font-mono text-[0.55rem] tracking-[0.18em] text-white/45 uppercase">
                42.87° N / Kyrgyzstan
              </p>
            </div>
            <button
              aria-label="Закрыть меню"
              className="mobile-menu-close"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <nav
            aria-label="Мобильная навигация"
            className="relative z-10 my-auto py-10"
          >
            <p className="mb-5 font-mono text-[0.6rem] tracking-[0.2em] text-white/45 uppercase">
              Выберите направление
            </p>
            <ul>
              {siteConfig.navigation.map((item, index) => (
                <li key={item.href}>
                  <Link
                    className="mobile-menu-link group"
                    href={item.href}
                    onClick={() => dialogRef.current?.close()}
                  >
                    <span className="font-mono text-xs text-white/45">
                      0{index + 1}
                    </span>
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className="text-xl text-white/35 transition-transform group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 text-[0.65rem] tracking-[0.12em] text-white/60 uppercase">
            <Link href="/search" onClick={() => dialogRef.current?.close()}>
              Поиск
            </Link>
            <Link href="/wishlist" onClick={() => dialogRef.current?.close()}>
              Избранное
            </Link>
            <Link href="/cart" onClick={() => dialogRef.current?.close()}>
              Корзина
            </Link>
          </div>
          <svg
            aria-hidden="true"
            className="mobile-menu-mountains"
            preserveAspectRatio="none"
            viewBox="0 0 390 110"
          >
            <path d="M0 110V76L52 38L89 69L139 17L184 67L230 42L270 76L321 24L390 72V110Z" />
            <path d="m0 87 61-31 31 22 45-42 48 44 44-23 42 35 52-47 67 40" />
          </svg>
        </div>
      </dialog>
    </>
  );
}
