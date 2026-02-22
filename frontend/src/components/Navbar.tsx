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
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="text-xl font-bold text-green-400">
            CreditVault
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: connect button + mobile hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton showBalance={true} />
          </div>
          <div className="sm:hidden">
            <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden flex flex-col items-center justify-center w-8 h-8 gap-1.5"
            aria-label="Toggle navigation"
          >
            <span
              className={`block h-0.5 w-5 rounded-full bg-gray-400 transition-all duration-200 ${
                mobileOpen ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-gray-400 transition-all duration-200 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-gray-400 transition-all duration-200 ${
                mobileOpen ? "-translate-y-[4px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav className="sm:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
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
