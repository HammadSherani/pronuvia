import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getOrderById } from "@/actions/admin/manage-orders";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { OrderStatusSelector } from "@/components/admin/order-status-selector";
import type { OrderItem } from "@/actions/admin/manage-orders";

type Props = { params: Promise<{ id: string }> };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const statusStyle: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50 text-teal-700 border-teal-200",
  CANCELLED:  "bg-red-50 text-red-700 border-red-200",
  REFUNDED:   "bg-gray-100 text-gray-600 border-gray-200",
};

export default async function OrderViewPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const items = order.items as unknown as OrderItem[];

  return (
    <div className="max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-3 py-1 border rounded-full text-xs font-medium ${statusStyle[order.status]}`}>
            {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
          </span>
          <OrderStatusSelector orderId={id} current={order.status} />
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Placed {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Commission cards — key design: rate is frozen at order time */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-3 grid grid-cols-3 gap-5">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Order Total</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(order.total)}</p>
          </div>
          <div className="border-l border-gray-100 pl-5">
            <p className="text-xs text-gray-400 font-medium mb-1">Sales Rep Commission</p>
            <p className="text-2xl font-bold text-[#5BB8D4]">{fmt(order.salesRepCommissionAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              at <span className="font-semibold text-gray-600">{order.salesRepCommissionRate}%</span>
              {" "}— rate locked at order time
              {order.salesRep && (
                <span className="ml-1 text-gray-500">
                  (current: {order.salesRep.commission}%)
                </span>
              )}
            </p>
          </div>
          <div className="border-l border-gray-100 pl-5">
            <p className="text-xs text-gray-400 font-medium mb-1">Physician Commission</p>
            <p className="text-2xl font-bold text-[#8b5cf6]">{fmt(order.physicianCommissionAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              at <span className="font-semibold text-gray-600">{order.physicianCommissionRate}%</span>
              {" "}— rate locked at order time
              {order.physician && (
                <span className="ml-1 text-gray-500">
                  (current: {order.physician.commission}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Physician */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Physician</p>
          {order.physician ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5BB8D4]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#5BB8D4]">
                    {order.physician.firstName[0]}{order.physician.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Dr. {order.physician.firstName} {order.physician.lastName}</p>
                  <p className="text-xs text-gray-400">{order.physician.email}</p>
                  {order.physician.nameOfPractice && (
                    <p className="text-xs text-gray-400">{order.physician.nameOfPractice}</p>
                  )}
                </div>
              </div>
              <Link href={`/admin/physicians/${order.physician.id}`}
                className="mt-3 text-xs text-[#3DBFA4] hover:underline inline-block">
                View physician profile →
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-400">No physician linked to this order.</p>
          )}
        </div>

        {/* Sales Rep */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sales Representative</p>
          {order.salesRep ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#3DBFA4]">
                    {order.salesRep.name[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{order.salesRep.name}</p>
                  <p className="text-xs text-gray-400">{order.salesRep.email}</p>
                </div>
              </div>
              <Link href={`/admin/sales-reps/${order.salesRepId}`}
                className="mt-3 text-xs text-[#3DBFA4] hover:underline inline-block">
                View sales rep profile →
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-400">No sales rep linked to this physician.</p>
          )}
        </div>
      </div>

      {/* Payment */}
      {(order.paymentMethod || order.paymentStatus) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Payment</p>
          <div className="flex items-start gap-8">
            {order.paymentMethod && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Method</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-semibold ${
                  order.paymentMethod === "CARD"
                    ? "bg-[#5BB8D4]/10 text-[#5BB8D4] border-[#5BB8D4]/30"
                    : "bg-[#3DBFA4]/10 text-[#3DBFA4] border-[#3DBFA4]/30"
                }`}>
                  {order.paymentMethod === "CARD" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                    </svg>
                  )}
                  {order.paymentMethod === "CARD" ? "Credit / Debit Card" : "Wallet Balance"}
                </span>
              </div>
            )}

            {order.paymentStatus && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <span className={`inline-flex px-2.5 py-1 border rounded-full text-xs font-semibold ${
                  order.paymentStatus.toUpperCase() === "PAID"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.paymentStatus.toUpperCase() === "FAILED"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1).toLowerCase()}
                </span>
              </div>
            )}

            {order.transactionId && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Transaction ID</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg break-all">
                  {order.transactionId}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Order Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size / SKU</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="px-5 py-3.5 font-medium text-gray-800">{item.title}</td>
                <td className="px-5 py-3.5 text-gray-500">
                  <span className="text-gray-700">{item.variantSize || "—"}</span>
                  {item.sku && <span className="ml-2 text-xs text-gray-400">SKU: {item.sku}</span>}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700">{fmt(item.unitPrice)}</td>
                <td className="px-5 py-3.5 text-right text-gray-700">{item.quantity}</td>
                <td className="px-5 py-3.5 text-right font-medium text-gray-800">{fmt(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/60">
              <td colSpan={4} className="px-5 py-3.5 text-right font-semibold text-gray-700 text-sm">Total</td>
              <td className="px-5 py-3.5 text-right font-bold text-gray-900 text-sm">{fmt(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
