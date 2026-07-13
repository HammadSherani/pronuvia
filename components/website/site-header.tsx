"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import logo from "@/public/assets/logo.png";

const NAV = [
  { label: "The Problem",       href: "#the-problem" },
  { label: "How It Works",      href: "#how-it-works" },
  { label: "The Science",       href: "#the-science" },
  { label: "Research",          href: "#research" },
  { label: "For Practitioners", href: "#for-practitioners" },
];

export function SiteHeader({ dashboardHref }: { variant?: "overlay" | "solid"; dashboardHref?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#EEF2F7] border-b border-[#d5dde9]">
      <div className="max-w-7xl mx-auto px-8 flex items-center h-[72px]">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src={logo} alt="Pronuvia" width={160} height={50} className="w-auto h-9" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center justify-center gap-7 ml-12 flex-1">
          {NAV.map(({ label, href }) => (
            <a key={href} href={href}
              onClick={e => {
                e.preventDefault();
                const id = href.replace("#", "");
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-[#112c5faa] hover:text-[#1B2D4Faa] transition-colors whitespace-nowrap">
              {label}
            </a>
          ))}
        </nav>

        {/* Partner Login / Dashboard */}
        <div className="hidden lg:flex items-center ml-auto pl-6">
          {dashboardHref ? (
            <Link href={dashboardHref}
              className="px-6 py-2.5 bg-[#1B2D4F] hover:bg-[#0f1e36] text-white text-xs rounded-sm font-bold tracking-[0.12em] uppercase transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login"
              className="px-6 py-2.5 bg-[#1B2D4F] hover:bg-[#0f1e36] text-white text-xs rounded-sm font-bold tracking-[0.12em] uppercase transition-colors">
              Partner Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button type="button" onClick={() => setOpen(!open)}
          className="lg:hidden ml-auto w-9 h-9 flex items-center justify-center text-[#1B2D4F]">
          {open
            ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden px-6 pb-5 space-y-1 bg-[#EEF2F7] border-b border-[#d5dde9]">
          {NAV.map(({ label, href }) => (
            <a key={href} href={href}
              onClick={e => {
                e.preventDefault();
                setOpen(false);
                const id = href.replace("#", "");
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="block py-2.5 text-sm font-medium text-[#1B2D4F] border-b border-[#d5dde9]">
              {label}
            </a>
          ))}
          {dashboardHref ? (
            <Link href={dashboardHref} onClick={() => setOpen(false)}
              className="mt-3 w-full flex items-center justify-center py-2.5 bg-[#1B2D4F] text-white text-xs font-bold tracking-[0.12em] uppercase">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}
              className="mt-3 w-full flex items-center justify-center py-2.5 bg-[#1B2D4F] text-white text-xs font-bold tracking-[0.12em] uppercase">
              Partner Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
