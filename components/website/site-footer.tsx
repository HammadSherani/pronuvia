"use client";

import Link from "next/link";
import { useState } from "react";

const SHOP_COL_1 = [
  { label: "SAC-SG",    href: "/shop/sac-sg" },
  { label: "MARAH-CEL", href: "/shop/marah-cel" },
  { label: "ALZI-CEL",  href: "/shop/alzi-cel" },
  { label: "RECATRIL",  href: "/shop/recatril" },
  { label: "DENTOSSO",  href: "/shop/dentosso" },
];

const SHOP_COL_2 = [
  { label: "NEO-CEL",       href: "/shop/neo-cel" },
  { label: "KIDS-CEL",      href: "/shop/kids-cel" },
  { label: "TEEN-CEL",      href: "/shop/teen-cel" },
  { label: "DAILY PROTOCOL",href: "/shop/daily-protocol" },
  { label: "BUNDLES",       href: "/shop/bundles" },
];

const ABOUT_LINKS = [
  { label: "SAC® TECHNOLOGY", href: "/about/sac-technology" },
  { label: "CLINICAL STUDY",  href: "/about/clinical-study" },
  { label: "CBHI",            href: "/about/cbhi" },
  { label: "BLOG",            href: "/blog" },
  { label: "MN REWARDS",      href: "/rewards" },
];

const CONTACT_LINKS = [
  { label: "FAQ",                  href: "/faq" },
  { label: "SHIPPING & RETURNS",   href: "/shipping-returns" },
  { label: "Terms and conditions", href: "/terms" },
  { label: "Partnering physician", href: "/partnering-physician" },
];

const BOTTOM_LINKS = [
  { label: "Terms of use",  href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  return (
    <footer className="bg-[#0a0a0a] text-white">
      {/* ── Main footer body ── */}
      <div className="max-w-7xl mx-auto px-6 py-10  rounded-2xl my-6 mx-6 lg:mx-auto">

        {/* Top bar — logo + CTA + socials */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 select-none">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path d="M14 2C8 2 3 7 3 13c0 4 2.5 7.5 6 9.5V24a1 1 0 001 1h8a1 1 0 001-1v-1.5c3.5-2 6-5.5 6-9.5 0-6-5-11-11-11z"
                fill="#3DBFA4" opacity="0.9"/>
              <path d="M10 13c1-3 4-5 7-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-white font-semibold text-xl" style={{ fontFamily: "Georgia, serif" }}>
              Pronuvia
            </span>
          </Link>

          {/* Right — button + socials */}
          <div className="flex items-center gap-4">
            <a
              href="sms:+1234567890"
              className="px-5 py-2 border border-white/40 hover:border-[#3DBFA4] text-white text-xs font-bold tracking-widest uppercase rounded transition-colors"
            >
              Let&apos;s Text
            </a>

            {/* Instagram */}
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/20 hover:border-[#3DBFA4] flex items-center justify-center text-white/70 hover:text-[#3DBFA4] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.326 3.608 1.301.975.975 1.24 2.242 1.301 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.326 2.633-1.301 3.608-.975.975-2.242 1.24-3.608 1.301-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.326-3.608-1.301-.975-.975-1.24-2.242-1.301-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.326-2.633 1.301-3.608C4.509 2.567 5.776 2.225 7.142 2.233 8.408 2.175 8.788 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/20 hover:border-[#3DBFA4] flex items-center justify-center text-white/70 hover:text-[#3DBFA4] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/20 hover:border-[#3DBFA4] flex items-center justify-center text-white/70 hover:text-[#3DBFA4] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Links + newsletter grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 pt-8">

          {/* SHOP col 1 */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-widest mb-4">SHOP</h4>
            <ul className="space-y-2.5">
              {SHOP_COL_1.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 hover:text-[#3DBFA4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* SHOP col 2 — no heading */}
          <div className="pt-0 sm:pt-8">
            <ul className="space-y-2.5">
              {SHOP_COL_2.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 hover:text-[#3DBFA4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ABOUT US */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-widest mb-4">ABOUT US</h4>
            <ul className="space-y-2.5">
              {ABOUT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 hover:text-[#3DBFA4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CONTACT US */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-widest mb-4">CONTACT US</h4>
            <ul className="space-y-2.5">
              {CONTACT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 hover:text-[#3DBFA4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* MAKE YOUR DAY */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h4 className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-2">
              Make Your Day
            </h4>
            <h3
              className="text-white text-3xl font-normal leading-tight mb-5"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Healthy &amp; Better
            </h3>

            {/* Email row */}
            <div className="flex items-stretch border border-white/20 rounded overflow-hidden mb-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR EMAIL"
                className="flex-1 bg-white text-gray-800 text-xs px-4 py-3 placeholder-gray-400 outline-none min-w-0"
              />
              <button
                type="button"
                className="bg-[#3DBFA4] hover:bg-[#35a993] text-white text-xs font-bold tracking-widest px-4 transition-colors whitespace-nowrap"
              >
                SUBSCRIBE
              </button>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[#3DBFA4]"
              />
              <span className="text-white/40 text-[10px] leading-relaxed">
                Subscribe to receive communication from Marah Natural about products
                and news. By subscribing you confirm to have read and accept our privacy
                policy. By signing up via e-mail, you agree to receive marketing messages
                from Marah Natural.
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className=" rounded-xl px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-white/40 text-xs leading-relaxed max-w-sm">
            *These statements have not been evaluated by the Food and Drug Administration.
            This product is not intended to diagnose, treat, cure or prevent any disease.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
            {BOTTOM_LINKS.map((l, i) => (
              <span key={l.href} className="flex items-center gap-4">
                <Link href={l.href} className="hover:text-[#3DBFA4] transition-colors">
                  {l.label}
                </Link>
                {i < BOTTOM_LINKS.length - 1 && <span className="text-white/20">|</span>}
              </span>
            ))}
            <span className="text-white/30">|</span>
            <span>@Pronuvia 2026. All Rights Reserved</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
