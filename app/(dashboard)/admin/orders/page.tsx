import Link from "next/link";
import type React from "react";
import { listOrders } from "@/actions/admin/manage-orders";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatus } from "@/app/generated/prisma/enums";

export const metadata = { title: "Orders – Pronuvia Admin" };

const statusStyle: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50 text-teal-700 border-teal-200",
  CANCELLED:  "bg-red-50 text-red-700 border-red-200",
  REFUNDED:   "bg-gray-100 text-gray-600 border-gray-200",
};

const paymentStatusStyle: Record<string, string> = {
  PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED:  "bg-red-50 text-red-700 border-red-200",
};

const paymentMethodIcon: Record<string, React.ReactNode> = {
  CARD: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  WALLET: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 10h18M3 6h18M3 14h18M3 18h18" />
    </svg>
  ),
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function OrdersPage() {
  const orders = await listOrders();

  const totalRevenue     = orders.reduce((s, o) => s + o.total, 0);
  const totalSalesRep    = orders.reduce((s, o) => s + o.salesRepCommissionAmount, 0);
  const totalPhysician   = orders.reduce((s, o) => s + o.physicianCommissionAmount, 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="All orders with snapshotted commission at time of placement"
        actionLabel="Create Order"
        actionHref="/admin/orders/new"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Total Revenue",            value: fmt(totalRevenue),   color: "#3DBFA4" },
          { label: "Sales Rep Commission",      value: fmt(totalSalesRep),  color: "#5BB8D4" },
          { label: "Physician Commission",      value: fmt(totalPhysician), color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className="text-xl font-bold text-gray-800">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No orders yet</p>
            <Link href="/admin/orders/new" className="mt-3 text-sm text-[#3DBFA4] hover:underline font-medium">
              Create first order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Physician</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Rep</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rep Commission
                  <span className="text-gray-300 font-normal ml-1">(rate → $)</span>
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Dr. Commission
                  <span className="text-gray-300 font-normal ml-1">(rate → $)</span>
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-medium text-gray-700">{o.orderNumber}</td>
                  <td className="px-5 py-3.5 text-gray-700">
                    {o.physician
                      ? <>
                          Dr. {o.physician.firstName} {o.physician.lastName}
                          {o.physician.nameOfPractice && (
                            <p className="text-xs text-gray-400">{o.physician.nameOfPractice}</p>
                          )}
                        </>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{o.salesRep?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{fmt(o.total)}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400">{o.salesRepCommissionRate}%</span>
                    <span className="mx-1 text-gray-300">→</span>
                    <span className="text-sm font-medium text-[#5BB8D4]">{fmt(o.salesRepCommissionAmount)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400">{o.physicianCommissionRate}%</span>
                    <span className="mx-1 text-gray-300">→</span>
                    <span className="text-sm font-medium text-[#8b5cf6]">{fmt(o.physicianCommissionAmount)}</span>
                  </td>
                  {/* Payment */}
                  <td className="px-5 py-3.5">
                    {o.paymentMethod ? (
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-xs font-medium w-fit ${
                          o.paymentMethod === "CARD"
                            ? "bg-[#5BB8D4]/10 text-[#5BB8D4] border-[#5BB8D4]/30"
                            : "bg-[#3DBFA4]/10 text-[#3DBFA4] border-[#3DBFA4]/30"
                        }`}>
                          {paymentMethodIcon[o.paymentMethod]}
                          {o.paymentMethod === "CARD" ? "Card" : "Wallet"}
                        </div>
                        {o.paymentStatus && (
                          <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium w-fit ${
                            paymentStatusStyle[o.paymentStatus.toUpperCase()] ?? "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {o.paymentStatus.charAt(0).toUpperCase() + o.paymentStatus.slice(1).toLowerCase()}
                          </span>
                        )}
                        {o.transactionId && (
                          <p className="text-[10px] text-gray-400 font-mono truncate max-w-[110px]" title={o.transactionId}>
                            {o.transactionId.slice(0, 14)}…
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${statusStyle[o.status]}`}>
                      {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/orders/${o.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
