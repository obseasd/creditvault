"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/strategies", label: "Strategies" },
  { href: "/transactions", label: "Transactions" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-cv-page/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="text-xl font-bold text-cv-green">
            CreditVault
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === href
                    ? "bg-cv-elevated text-cv-text1"
                    : "text-cv-text3 hover:text-cv-text1 hover:bg-cv-elevated/50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton showBalance={true} />
          </div>
          <div className="sm:hidden">
            <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden flex flex-col items-center justify-center w-8 h-8 gap-1.5"
            aria-label="Toggle navigation"
          >
            <span
              className={`block h-0.5 w-5 rounded-full bg-cv-text3 transition-all duration-200 ${
                mobileOpen ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-cv-text3 transition-all duration-200 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-cv-text3 transition-all duration-200 ${
                mobileOpen ? "-translate-y-[4px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="sm:hidden bg-cv-page/95 backdrop-blur-xl px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  pathname === href
                    ? "bg-cv-elevated text-cv-text1"
                    : "text-cv-text3 hover:text-cv-text1 hover:bg-cv-elevated/50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
