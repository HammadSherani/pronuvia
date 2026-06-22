import { requireAdmin } from "@/lib/auth/dal";
import { getDashboardStats } from "@/actions/admin/dashboard";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard – Pronuvia" };

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

type KPIProps = {
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
  href: string;
  icon: React.ReactNode;
};

function KPICard({ label, value, sub, color, bg, href, icon }: KPIProps) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <svg
          className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition-colors mt-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [session, stats] = await Promise.all([requireAdmin(), getDashboardStats()]);
  const { kpis } = stats;

  const cards: KPIProps[] = [
    {
      label: "Sales Representatives",
      value: String(kpis.salesRepsCount),
      sub: "Total registered reps",
      color: "#3DBFA4",
      bg: "#edfaf6",
      href: "/admin/sales-reps",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Partnering Physicians",
      value: String(kpis.physiciansCount),
      sub: "Approved doctors",
      color: "#5BB8D4",
      bg: "#edf6fb",
      href: "/admin/physicians",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      label: "Withdrawal Requests",
      value: String(kpis.pendingWithdrawals),
      sub: kpis.pendingWithdrawals > 0 ? "Pending review" : "All cleared",
      color: kpis.pendingWithdrawals > 0 ? "#d97706" : "#6b7280",
      bg: kpis.pendingWithdrawals > 0 ? "#fffbeb" : "#f3f4f6",
      href: "/admin/withdrawals",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "Total Orders",
      value: String(kpis.totalOrders),
      sub: "All time",
      color: "#7c3aed",
      bg: "#f5f3ff",
      href: "/admin/orders",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      label: "Gross Revenue",
      value: fmtMoney(kpis.totalRevenue),
      sub: "All time revenue",
      color: "#059669",
      bg: "#ecfdf5",
      href: "/admin/orders",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{fmtDate(new Date())}</p>
        </div>
  
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Pending-withdrawal alert ── */}
      {kpis.pendingWithdrawals > 0 && (
        <Link
          href="/admin/withdrawals"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 hover:bg-amber-100 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-2.194-.834-2.964 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {kpis.pendingWithdrawals} withdrawal request{kpis.pendingWithdrawals > 1 ? "s" : ""} pending review
            </p>
            <p className="text-xs text-amber-600">Click to review and approve or reject</p>
          </div>
          <svg className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ── Charts ── */}
      <DashboardCharts charts={stats.charts} />
    </div>
  );
}
