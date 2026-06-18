"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth/logout";
import type { Role } from "@/app/generated/prisma/enums";

type SubNavItem =
  | { label: string; href: string; action?: never }
  | { label: string; href?: never; action: () => void };

function buildSubNav(role: Role): SubNavItem[] {
  if (role === "ADMIN") {
    return [
      { label: "Partnering Physician", href: "/admin/physicians" },
      { label: "Downloads", href: "/admin/downloads" },
      { label: "Order History", href: "/admin/orders" },
      { label: "Withdrawals", href: "/admin/withdrawals" },
      { label: "Account Details", href: "/admin/account" },
      { label: "Log out", action: async () => { await logout(); } },
    ];
  }

  if (role === "SALES_REP") {
    return [
      { label: "Shop", href: "/sales/shop" },
      { label: "Cart", href: "/sales/cart" },
      { label: "Checkout", href: "/sales/checkout" },
      { label: "Partnering Physician", href: "/sales/physicians" },
      { label: "Wallet", href: "/sales/wallet" },
      { label: "Downloads", href: "/sales/downloads" },
      { label: "Order History", href: "/sales/orders" },
      { label: "Account Details", href: "/sales/account" },
      { label: "Log out", action: async () => { await logout(); } },
    ];
  }

  // PHYSICIAN
  return [
    { label: "Downloads", href: "/physician/downloads" },
    { label: "Order History", href: "/physician/orders" },
    { label: "Account Details", href: "/physician/account" },
    { label: "Log out", action: async () => { await logout(); } },
  ];
}

export function SubHeader({ role }: { role: Role }) {
  const pathname = usePathname();
  const subNavItems = buildSubNav(role);

  return (
    <nav className="bg-[#f3f4f5] border-b border-gray-200 sticky top-[70px] z-30">
      <div className="max-w-7xl mx-auto px-6 h-11 flex items-center justify-center gap-10">
        {subNavItems.map((item) => {
          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="text-[13px] text-[#6b7280] hover:text-[#374151] font-medium transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            );
          }

          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] font-medium transition-colors ${
                isActive
                  ? "text-[#3DBFA4] border-b-2 border-[#3DBFA4] pb-0.5"
                  : "text-[#6b7280] hover:text-[#374151]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
