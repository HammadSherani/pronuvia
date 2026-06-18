import Link from "next/link";
import { listOrders } from "@/actions/admin/manage-orders";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { OrderStatusSelector } from "@/components/admin/order-status-selector";
import { ReturnOrderModal, ReturnRowButton } from "@/components/admin/return-order-modal";

export const metadata = { title: "Order History – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const statusBadge: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50   text-amber-700   border-amber-200",
  PROCESSING: "bg-blue-50    text-blue-700    border-blue-200",
  SHIPPED:    "bg-indigo-50  text-indigo-700  border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50    text-teal-700    border-teal-200",
  CANCELLED:  "bg-red-50     text-red-700     border-red-200",
  REFUNDED:   "bg-orange-50  text-orange-700  border-orange-200",
};

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="w-8 h-1 rounded-full mb-3" style={{ background: color }} />
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function OrdersPage() {
  const orders = await listOrders();

  const totalRevenue    = orders.reduce((s, o) => s + o.total,                     0);
  const totalRepComm    = orders.reduce((s, o) => s + o.salesRepCommissionAmount,   0);
  const totalDrComm     = orders.reduce((s, o) => s + o.physicianCommissionAmount,  0);
  const totalClawback   = orders.reduce((s, o) => s + (o.salesRepClawback ?? 0),   0);

  const completedCount  = orders.filter((o) => o.status === "COMPLETED").length;
  const pendingCount    = orders.filter((o) => o.status === "PENDING" || o.status === "PROCESSING").length;
  const returnedCount   = orders.filter((o) => !!o.returnedAt).length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Order History</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track orders, update statuses, and manage commission clawbacks
          </p>
        </div>
        <ReturnOrderModal />
      </div>

      {/* ── Summary cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          sub={`${orders.length} orders total`}
          color="#3DBFA4"
        />
        <SummaryCard
          label="Rep Commissions Paid"
          value={fmt(totalRepComm)}
          sub={`${completedCount} completed`}
          color="#5BB8D4"
        />
        <SummaryCard
          label="Dr. Commissions Earned"
          value={fmt(totalDrComm)}
          sub={`${pendingCount} pending`}
          color="#8b5cf6"
        />
        <SummaryCard
          label="Commissions Clawed Back"
          value={fmt(totalClawback)}
          sub={`${returnedCount} returned`}
          color="#f97316"
        />
      </div>

      {/* ── Orders table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            All Orders
            <span className="ml-2 text-xs font-normal text-gray-400">({orders.length})</span>
          </h2>
          <p className="text-xs text-gray-400">
            Commission is credited to wallet only when status →{" "}
            <span className="font-semibold text-teal-600">Completed</span>
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No orders yet</p>
            <p className="text-xs text-gray-400 mt-1">Orders placed by sales reps will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {[
                    "Order",
                    "Physician",
                    "Sales Rep",
                    "Order Value",
                    "Commissions",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const isReturned = !!o.returnedAt;

                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-gray-50/60 transition-colors ${isReturned ? "opacity-60" : ""}`}
                    >

                      {/* ── Order # + date ── */}
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-bold text-gray-800 tracking-tight">
                          {o.orderNumber}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                        {isReturned && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-semibold rounded-full border border-orange-200">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            Returned
                          </span>
                        )}
                      </td>

                      {/* ── Physician ── */}
                      <td className="px-5 py-4">
                        {o.physician ? (
                          <>
                            <p className="text-sm font-medium text-gray-800">
                              Dr. {o.physician.firstName} {o.physician.lastName}
                            </p>
                            {o.physician.nameOfPractice && (
                              <p className="text-xs text-gray-400 mt-0.5 max-w-[160px] truncate">
                                {o.physician.nameOfPractice}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300 text-xs">No physician</span>
                        )}
                      </td>

                      {/* ── Sales rep ── */}
                      <td className="px-5 py-4">
                        {o.salesRep ? (
                          <p className="text-sm text-gray-700">{o.salesRep.name}</p>
                        ) : (
                          <span className="text-gray-300 text-xs">No rep</span>
                        )}
                      </td>

                      {/* ── Order value ── */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-800">{fmt(o.total)}</p>
                        {isReturned && o.returnedTotal != null && (
                          <p className="text-[11px] text-orange-500 mt-0.5 font-medium">
                            − {fmt(o.returnedTotal)} returned
                          </p>
                        )}
                      </td>

                      {/* ── Commissions ── */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {/* Sales Rep commission */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5BB8D4] shrink-0" />
                            <span className="text-xs text-gray-500">Rep:</span>
                            <span className="text-xs font-semibold text-[#5BB8D4]">
                              {fmt(o.salesRepCommissionAmount)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              ({o.salesRepCommissionRate}%)
                            </span>
                          </div>
                          {/* Physician commission */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shrink-0" />
                            <span className="text-xs text-gray-500">Dr:</span>
                            <span className="text-xs font-semibold text-[#8b5cf6]">
                              {fmt(o.physicianCommissionAmount)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              ({o.physicianCommissionRate}%)
                            </span>
                          </div>
                          {/* Clawback info */}
                          {isReturned && (o.salesRepClawback ?? 0) > 0 && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                              <span className="text-[10px] text-orange-500 font-medium">
                                − {fmt(o.salesRepClawback!)} clawed back
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ── Status ── */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-semibold w-fit ${statusBadge[o.status]}`}
                          >
                            {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                          </span>
                          {!isReturned && (
                            <OrderStatusSelector orderId={o.id} current={o.status} />
                          )}
                        </div>
                      </td>

                      {/* ── Actions ── */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors w-fit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Invoice
                          </Link>
                          <ReturnRowButton
                            orderId={o.id}
                            orderNumber={o.orderNumber}
                            alreadyReturned={isReturned}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5BB8D4]" />
          Rep commission = upline rate for that physician at order time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          Dr commission = physician's own rate at order time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          Clawback = commission deducted from wallet on return
        </span>
      </div>
    </div>
  );
}
