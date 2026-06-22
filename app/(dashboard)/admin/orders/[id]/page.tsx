import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getOrderById } from "@/actions/admin/manage-orders";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { OrderStatusSelector } from "@/components/admin/order-status-selector";
import { ReturnRowButton } from "@/components/admin/return-order-modal";
import { PrintButton } from "@/components/sales/print-button";
import type { OrderItem } from "@/actions/admin/manage-orders";

type Props = { params: Promise<{ id: string }> };

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

const orderStatusStyle: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50   text-amber-700   border-amber-200",
  PROCESSING: "bg-blue-50    text-blue-700    border-blue-200",
  SHIPPED:    "bg-indigo-50  text-indigo-700  border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50    text-teal-700    border-teal-200",
  CANCELLED:  "bg-red-50     text-red-700     border-red-200",
  REFUNDED:   "bg-orange-50  text-orange-700  border-orange-200",
};

const payStatusStyle: Record<string, string> = {
  PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50   text-amber-700   border-amber-200",
  FAILED:  "bg-red-50     text-red-700     border-red-200",
};

function InfoBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-700 leading-snug">{value}</p>
    </div>
  );
}

export default async function AdminOrderInvoicePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const items      = order.items as unknown as OrderItem[];
  const isReturned = !!order.returnedAt;
  const payStatus  = order.paymentStatus ?? "PENDING";
  const statusCls  = payStatusStyle[payStatus.toUpperCase()] ?? payStatusStyle["PENDING"];

  // Build physician address string
  const physAddr = [
    order.physician?.addressOne,
    order.physician?.addressTwo,
    order.physician?.city,
    order.physician?.state,
    order.physician?.zipCode,
  ].filter(Boolean).join(", ");

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="max-w-3xl mx-auto">

        {/* ── Admin toolbar (no-print) ─────────────────────────────── */}
        <div className="no-print flex items-center justify-between mb-6 gap-3 flex-wrap">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Order History
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2.5 py-1 border rounded-full text-xs font-semibold ${orderStatusStyle[order.status]}`}>
              {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
            </span>
            {!isReturned && <OrderStatusSelector orderId={id} current={order.status} />}
            <ReturnRowButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              alreadyReturned={isReturned}
            />
            <PrintButton />
          </div>
        </div>

        {/* ── Return info banner ───────────────────────────────────── */}
        {isReturned && (
          <div className="no-print mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-orange-700">
                Return processed — {new Date(order.returnedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-orange-600">
                {order.returnedTotal != null && (
                  <span>Returned value: <span className="font-semibold">{fmtMoney(order.returnedTotal)}</span></span>
                )}
                {(order.salesRepClawback ?? 0) > 0 && (
                  <span>Rep wallet clawback: <span className="font-semibold">−{fmtMoney(order.salesRepClawback!)}</span></span>
                )}
                {(order.physicianClawback ?? 0) > 0 && (
                  <span>Dr. commission noted: <span className="font-semibold">−{fmtMoney(order.physicianClawback!)}</span></span>
                )}
              </div>
              {order.returnReason && (
                <p className="mt-1 text-xs text-orange-400 italic">"{order.returnReason}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── Commission summary (admin-only, no-print) ────────────── */}
        <div className="no-print mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium mb-1">Order Total</p>
            <p className="text-xl font-bold text-gray-800">{fmtMoney(order.total)}</p>
            {isReturned && order.returnedTotal != null && (
              <p className="text-xs text-orange-500 mt-0.5 font-medium">
                −{fmtMoney(order.returnedTotal)} returned
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-2 border-l-[#5BB8D4]">
            <p className="text-xs text-gray-400 font-medium mb-1">Sales Rep Commission</p>
            <p className="text-xl font-bold text-[#5BB8D4]">{fmtMoney(order.salesRepCommissionAmount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.salesRepCommissionRate}% at order time
              {order.salesRep && <span className="text-gray-300"> · now {order.salesRep.commission}%</span>}
            </p>
            {(order.salesRepClawback ?? 0) > 0 && (
              <p className="text-xs text-orange-500 font-medium mt-0.5">−{fmtMoney(order.salesRepClawback!)} clawed back</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-2 border-l-[#8b5cf6]">
            <p className="text-xs text-gray-400 font-medium mb-1">Physician Commission</p>
            <p className="text-xl font-bold text-[#8b5cf6]">{fmtMoney(order.physicianCommissionAmount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.physicianCommissionRate}% at order time
              {order.physician && <span className="text-gray-300"> · now {order.physician.commission}%</span>}
            </p>
            {(order.physicianClawback ?? 0) > 0 && (
              <p className="text-xs text-orange-500 font-medium mt-0.5">−{fmtMoney(order.physicianClawback!)} noted</p>
            )}
          </div>
        </div>

        {/* ── Invoice card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Gradient header */}
          <div className="bg-gradient-to-r from-[#3DBFA4] to-[#35a993] px-8 py-7 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight">PRONUVIA</p>
                <p className="text-sm text-white/70 mt-0.5">Health &amp; Wellness Products</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 uppercase tracking-wider">Invoice</p>
                <p className="text-xl font-bold font-mono mt-0.5">{order.orderNumber}</p>
                <p className="text-xs text-white/70 mt-1">{fmtDate(order.createdAt)}</p>
              </div>
            </div>

            {/* Order status + payment row */}
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-white ${orderStatusStyle[order.status]}`}>
                {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
              </span>
              {order.paymentStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-white ${statusCls}`}>
                  {payStatus === "PAID" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {payStatus}
                </span>
              )}
              {order.paymentMethod && (
                <span className="text-xs text-white/80 font-medium">
                  {order.paymentMethod === "CARD" ? "💳 Credit / Debit Card" : "👛 Wallet Balance"}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">

            {/* Transaction ID */}
            {order.transactionId && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</p>
                  <p className="text-sm font-mono font-medium text-gray-800 mt-0.5 break-all">
                    {order.transactionId}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            )}

            {/* Bill To / Ordered By */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To (Physician)</p>
                {order.physician ? (
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <p className="font-semibold">Dr. {order.physician.firstName} {order.physician.lastName}</p>
                    {order.physician.nameOfPractice && (
                      <p className="text-gray-600">{order.physician.nameOfPractice}</p>
                    )}
                    <p className="text-gray-500">{order.physician.email}</p>
                    {order.physician.phone && <p className="text-gray-500">{order.physician.phone}</p>}
                    {physAddr && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{physAddr}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No physician linked</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordered By (Sales Rep)</p>
                {order.salesRep ? (
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <p className="font-semibold">{order.salesRep.name}</p>
                    <p className="text-gray-500">{order.salesRep.email}</p>
                    {order.salesRep.phone && <p className="text-gray-500">{order.salesRep.phone}</p>}
                    {order.salesRep.billingAddress && (
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{order.salesRep.billingAddress}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No sales rep linked</p>
                )}
              </div>
            </div>

            {/* Info boxes row */}
            <div className="grid grid-cols-3 gap-4">
              <InfoBox
                label="Shipping Method"
                value={
                  (order.shippingRate ?? 0) === 0
                    ? "Free Standard"
                    : `Standard · ${fmtMoney(order.shippingRate ?? 0)}`
                }
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                }
              />
              <InfoBox
                label="Estimated Delivery"
                value={fmtDate(order.estimatedDelivery)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <InfoBox
                label="Ship To"
                value={order.shippingAddress ?? "Not specified"}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </div>

            {/* Items table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size / SKU</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => {
                    const returnedIdxs = isReturned && Array.isArray(order.returnedItems)
                      ? (order.returnedItems as number[])
                      : null;
                    const isItemReturned = returnedIdxs ? returnedIdxs.includes(idx) : isReturned;

                    return (
                      <tr key={idx} className={isItemReturned ? "opacity-50" : ""}>
                        <td className="px-4 py-3.5 font-medium text-gray-800">
                          {item.title}
                          {isItemReturned && (
                            <span className="ml-2 text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                              Returned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-500">
                          {item.variantSize || "—"}
                          {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-right text-gray-700">{fmtMoney(item.unitPrice)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                          {isItemReturned
                            ? <span className="line-through text-gray-300">{fmtMoney(item.lineTotal)}</span>
                            : fmtMoney(item.lineTotal)
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmtMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>
                    {(order.shippingRate ?? 0) === 0
                      ? <span className="text-[#3DBFA4] font-medium">Free</span>
                      : fmtMoney(order.shippingRate ?? 0)
                    }
                  </span>
                </div>
                {isReturned && order.returnedTotal != null && (
                  <div className="flex justify-between text-sm text-orange-500 font-medium">
                    <span>Returned</span>
                    <span>−{fmtMoney(order.returnedTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>
                    {isReturned && order.returnedTotal != null
                      ? fmtMoney(order.total - order.returnedTotal)
                      : fmtMoney(order.total)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 pt-5 text-center">
              <p className="text-sm font-semibold text-gray-700">Thank you for your order!</p>
              <p className="text-xs text-gray-400 mt-1">
                For questions, contact your account manager or reach us at support@pronuvia.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
