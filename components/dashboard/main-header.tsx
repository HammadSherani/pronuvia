"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PronuviaLogoDark } from "./pronuvia-logo-dark";
import { useCart } from "@/lib/cart/cart-context";
import type { Role } from "@/app/generated/prisma/enums";

function CartIcon() {
  const { totalItems } = useCart();
  return (
    <Link href="/sales/cart" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors">
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#3DBFA4] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}

type NavChild = { label: string; href: string };
type NavItem =
  | { label: string; href: string; children?: never }
  | { label: string; href?: never; children: NavChild[] };

function buildNav(role: Role): NavItem[] {
  const base: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
  ];

  if (role === "ADMIN") {
    return [
      ...base,
      { label: "Account Application", href: "/admin/applications" },
      {
        label: "Account Management",
        children: [
          { label: "Sales Representatives", href: "/admin/sales-reps" },
          { label: "Partnering Physicians", href: "/admin/physicians" },
          { label: "Partnering Physicians Requests", href: "/admin/approvals" },
        ],
      },
         {
        label: "Product Management",
        children: [
          { label: "Products", href: "/admin/products" },
          { label: "Categories", href: "/admin/categories" },
          { label: "Sub-Categories", href: "/admin/sub-categories" },
        ],
      },
      
      { label: "Contact Us", href: "/contact" },
      {
        label: "Withdrawal Request",
        children: [
          { label: "New Request", href: "/admin/withdrawals/new" },
          { label: "History", href: "/admin/withdrawals" },
        ],
      },
      {
        label: "My Account",
        children: [
          { label: "Account Details", href: "/admin/account" },
          { label: "Log out", href: "/logout" },
        ],
      },
    ];
  }

  if (role === "SALES_REP") {
    return [
      ...base,
      { label: "Account Application", href: "/sales/applications" },
      {
        label: "Manage",
        children: [
          { label: "Partnering Physicians", href: "/sales/physicians" },
        ],
      },
      { label: "Contact Us", href: "/contact" },
      {
        label: "Withdrawal Request",
        children: [
          { label: "New Request", href: "/sales/withdrawals/new" },
          { label: "History", href: "/sales/withdrawals" },
        ],
      },
      {
        label: "My Account",
        children: [
          { label: "Account Details", href: "/sales/account" },
          { label: "Log out", href: "/logout" },
        ],
      },
    ];
  }

  // PHYSICIAN
  return [
    ...base,
    { label: "Contact Us", href: "/contact" },
    {
      label: "My Account",
      children: [
        { label: "Account Details", href: "/physician/account" },
        { label: "Log out", href: "/logout" },
      ],
    },
  ];
}

function DropdownMenu({ item }: { item: NavItem & { children: NavChild[] } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, close]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[#6b7280] hover:text-[#374151] text-sm font-medium transition-colors cursor-pointer"
      >
        {item.label}
        <svg
          className={`w-3.5 h-3.5 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={close}
              className="block px-4 py-2.5 text-sm text-[#6b7280] hover:bg-gray-50 hover:text-[#374151] transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MainHeader({ role }: { role: Role }) {
  const navItems = buildNav(role);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
        {/* Logo */}
        <PronuviaLogoDark />

        {/* Nav */}
        <nav className="flex items-center gap-7">
          {navItems.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label} item={item as NavItem & { children: NavChild[] }} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-[#6b7280] hover:text-[#374151] text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
          {role === "SALES_REP" && <CartIcon />}
        </nav>
      </div>
    </header>
  );
}
