"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { DashboardStats } from "@/actions/admin/dashboard";

type Period = "daily" | "weekly" | "monthly";

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "#f59e0b",
  PROCESSING: "#3b82f6",
  SHIPPED:    "#8b5cf6",
  DELIVERED:  "#10b981",
  COMPLETED:  "#3DBFA4",
  CANCELLED:  "#ef4444",
  REFUNDED:   "#94a3b8",
};

const COMMISSION_COLORS = ["#3DBFA4", "#5BB8D4"];

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-sm min-w-[140px]">
      <p className="text-gray-400 font-medium mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500 text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-gray-800 text-xs">
            {p.name === "Revenue" ? fmtMoney(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-300">
      <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
}

function OrdersRevenueChart({ data }: { data: { label: string; orders: number; revenue: number }[] }) {
  const hasData = data.some((d) => d.orders > 0 || d.revenue > 0);
  if (!hasData) return <EmptyState message="No orders in this period" />;
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5BB8D4" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#5BB8D4" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
        <YAxis
          yAxisId="right" orientation="right"
          tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44}
          tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar yAxisId="left" dataKey="orders" name="Orders" fill="url(#barGrad)" radius={[5, 5, 0, 0]} maxBarSize={36} />
        <Line yAxisId="right" dataKey="revenue" name="Revenue" stroke="#3DBFA4" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function StatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return <EmptyState message="No order data" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="status" innerRadius={58} outerRadius={85} paddingAngle={2} startAngle={90} endAngle={450}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} orders`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-800">{total}</span>
            <span className="text-xs text-gray-400">orders</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] ?? "#94a3b8" }} />
            <span className="text-xs text-gray-500 capitalize truncate">{d.status.toLowerCase()}</span>
            <span className="text-xs font-semibold text-gray-700 ml-auto shrink-0">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommissionDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyState message="No commission data" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={85} paddingAngle={4} startAngle={90} endAngle={450}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COMMISSION_COLORS[i % COMMISSION_COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [fmtMoney(Number(v)), "Commission"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-gray-800">{fmtMoney(total)}</span>
            <span className="text-xs text-gray-400">total</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COMMISSION_COLORS[i] }} />
              <span className="text-gray-500 text-xs">{d.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-800 text-xs">{fmtMoney(d.value)}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-gray-400 text-xs">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardCharts({ charts }: { charts: DashboardStats["charts"] }) {
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <div className="space-y-6">
      {/* ── Orders & Revenue ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Orders &amp; Revenue</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#5BB8D4] inline-block" /> Orders (bars)
              </span>
              <span className="mx-2 text-gray-200">|</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3DBFA4] inline-block" /> Revenue (line)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                  period === p
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="px-2 pb-4">
          <OrdersRevenueChart data={charts[period]} />
        </div>
      </div>

      {/* ── Donut charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800">Order Status Breakdown</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Last 12 months</p>
          <StatusDonut data={charts.statusBreakdown} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800">Commission Split</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Sales Rep vs Physician · last 12 months</p>
          <CommissionDonut data={charts.commissionBreakdown} />
        </div>
      </div>
    </div>
  );
}
