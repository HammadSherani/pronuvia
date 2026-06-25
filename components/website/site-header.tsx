"use client";

import Link        from "next/link";
import { usePathname } from "next/navigation";
import { useState }    from "react";

const NAV = [
  { label: "Home",                href: "/" },
  { label: "About",               href: "/about" },
  { label: "Contact",             href: "/contact" },
  { label: "Partnering physician", href: "/partnering-physician" },
];

export function SiteHeader({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const pathname   = usePathname();
  const [open, setOpen] = useState(false);

  const isSolid = variant === "solid";

  return (
    <header className={isSolid
      ? "sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm"
      : "absolute top-0 inset-x-0 z-50"
    }>
      <div className="max-w-7xl mx-auto px-6 flex items-center h-16">

        {/* ── Logo (left) ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 select-none w-1/3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2C8 2 3 7 3 13c0 4 2.5 7.5 6 9.5V24a1 1 0 001 1h8a1 1 0 001-1v-1.5c3.5-2 6-5.5 6-9.5 0-6-5-11-11-11z"
              fill="#3DBFA4" opacity="0.9"/>
            <path d="M10 13c1-3 4-5 7-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span
            className={`font-semibold text-xl tracking-wide ${isSolid ? "text-gray-900" : "text-white"}`}
            style={{ fontFamily: "Georgia, serif" }}
          >
            Pronuvia
          </span>
        </Link>

        {/* ── Desktop nav (center) ── */}
        <nav className="hidden md:flex items-center justify-center gap-8 w-1/3">
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href
                  ? "text-[#3DBFA4]"
                  : isSolid
                    ? "text-gray-600 hover:text-[#3DBFA4]"
                    : "text-white/90 hover:text-[#3DBFA4]"
              }`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Login (right) ── */}
        <div className="hidden md:flex justify-end w-1/3">
          <Link href="/login"
            className="inline-flex items-center px-5 py-2 bg-[#3DBFA4] hover:bg-[#35a993] text-white text-sm font-semibold rounded-lg transition-colors shadow">
            Login
          </Link>
        </div>

        {/* ── Mobile hamburger ── */}
        <button type="button" onClick={() => setOpen(!open)}
          className={`md:hidden ml-auto w-9 h-9 flex items-center justify-center ${isSolid ? "text-gray-700" : "text-white"}`}>
          {open
            ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className={`md:hidden px-6 pb-5 space-y-1 ${isSolid ? "bg-white border-b border-gray-100" : "bg-black/80 backdrop-blur-md"}`}>
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`block py-2.5 text-sm font-medium border-b ${
                isSolid ? "border-gray-100" : "border-white/10"
              } ${pathname === href ? "text-[#3DBFA4]" : isSolid ? "text-gray-600" : "text-white/90"}`}>
              {label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}
            className="mt-3 w-full flex items-center justify-center py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-lg">
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
