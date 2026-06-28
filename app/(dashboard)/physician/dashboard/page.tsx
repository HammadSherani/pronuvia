import Link from "next/link";
import { requirePhysician } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";


export const metadata = { title: "Dashboard – Pronuvia" };

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_DOT: Record<string, string> = {
  PENDING:    "bg-amber-400",
  PROCESSING: "bg-blue-400",
  SHIPPED:    "bg-violet-400",
  DELIVERED:  "bg-emerald-400",
  COMPLETED:  "bg-teal-400",
  CANCELLED:  "bg-red-400",
  REFUNDED:   "bg-gray-400",
};

export default async function PhysicianDashboardPage() {
  const session = await requirePhysician();

  const [physician, orderAggregate, recentOrders, pendingWithdrawals] = await Promise.all([
    prisma.partneringPhysician.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, walletBalance: true, salesRep: { select: { firstName: true, lastName: true } } },
    }),
    prisma.order.aggregate({
      where: { physicianId: session.userId },
      _count: true,
      _sum: { physicianCommissionAmount: true },
    }),
    prisma.order.findMany({
      where: { physicianId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
    }),
    prisma.withdrawRequest.count({
      where: { userId: session.userId, userRole: "PHYSICIAN", status: "PENDING" },
    }),
  ]);

  const totalOrders      = orderAggregate._count;
  const totalCommission  = orderAggregate._sum.physicianCommissionAmount ?? 0;
  const walletBalance    = physician?.walletBalance ?? 0;
  const repName          = physician?.salesRep ? `${physician.salesRep.firstName} ${physician.salesRep.lastName}` : null;

  const kpiCards = [
    {
      label: "My Orders",
      value: totalOrders.toString(),
      sub: "Total placed",
      href: "/physician/orders",
      color: "#3DBFA4",
      bg: "#edfaf6",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      label: "Commission Earned",
      value: fmtMoney(totalCommission),
      sub: "All time",
      href: "/physician/wallet",
      color: "#5BB8D4",
      bg: "#edf6fb",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Wallet Balance",
      value: fmtMoney(walletBalance),
      sub: "Available",
      href: "/physician/wallet",
      color: "#10b981",
      bg: "#ecfdf5",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "Pending Withdrawals",
      value: pendingWithdrawals.toString(),
      sub: pendingWithdrawals > 0 ? "Under review" : "None pending",
      href: "/physician/wallet",
      color: pendingWithdrawals > 0 ? "#d97706" : "#6b7280",
      bg:    pendingWithdrawals > 0 ? "#fffbeb" : "#f3f4f6",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">

        {/* ── LEFT: main content ── */}
        <div className="space-y-6 min-w-0">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {physician?.firstName ?? session.email}!
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Here&apos;s your account overview.
                {repName && (
                  <span className="text-gray-400"> Managed by <span className="font-medium text-gray-600">{repName}</span>.</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm shrink-0">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-gray-600">{today}</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: card.bg }}
                >
                  <div style={{ color: card.color }}>{card.icon}</div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800 tracking-tight">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Orders table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Recent Orders</h3>
                <p className="text-xs text-gray-400 mt-0.5">Your last 5 orders</p>
              </div>
              <Link href="/physician/orders" className="text-xs font-semibold text-[#3DBFA4] hover:underline">
                View All
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">No orders yet</p>
                <p className="text-xs text-gray-400 mt-1">Your orders will appear here once placed.</p>
                <Link
                  href="/physician/shop"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Browse Shop
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link href={`/physician/invoice/${o.orderNumber}`}>
                          <span className="font-mono text-xs font-semibold text-[#3DBFA4] hover:underline bg-gray-900/10 px-2 py-1 rounded-lg cursor-pointer">
                            #{o.orderNumber}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-800">{fmtMoney(o.total)}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[o.status] ?? "bg-gray-400"}`} />
                          {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div className="space-y-5">

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/physician/shop"
                className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Browse Shop
              </Link>
              {[
                { label: "My Orders",  href: "/physician/orders",  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label: "My Wallet", href: "/physician/wallet",  icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
                { label: "My Account", href: "/physician/account", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Account Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Orders",        value: totalOrders.toString(),      color: "#3DBFA4" },
                { label: "Commission Earned",   value: fmtMoney(totalCommission),  color: "#5BB8D4" },
                { label: "Wallet Balance",      value: fmtMoney(walletBalance),    color: "#10b981" },
                { label: "Pending Withdrawals", value: pendingWithdrawals.toString(), color: pendingWithdrawals > 0 ? "#d97706" : "#6b7280" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-gray-500">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {repName && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Your Sales Rep</h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-10 h-10 rounded-full bg-gray-900/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{repName}</p>
                  <p className="text-xs text-gray-400">Sales Representative</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
