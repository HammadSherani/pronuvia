import { notFound }              from "next/navigation";
import Link                       from "next/link";
import { requireAdmin }           from "@/lib/auth/dal";
import { getOrderById }           from "@/actions/admin/manage-orders";
import { OrderStatus }            from "@/generated/prisma/enums";
import { ReturnOrderModal }       from "@/components/admin/return-order-modal";
import { PrintButton }            from "@/components/sales/print-button";
import { SendOrderEmailPanel }    from "@/components/admin/send-order-email-panel";
import { OrderActionsPanel }      from "@/components/admin/order-actions-panel";
import { getOrderShipments }      from "@/actions/admin/shipping";
import type { OrderItem }         from "@/actions/admin/manage-orders";
import { getOrderNotes }          from "@/actions/admin/order-notes";
import { OrderNotesPanel }        from "@/components/admin/order-notes-panel";

type Props = { params: Promise<{ id: string }> };

type AddrObj = { firstName?: string; lastName?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string; country?: string };
function fmtAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const a: AddrObj = JSON.parse(raw);
    return [
      [a.firstName, a.lastName].filter(Boolean).join(" "),
      a.address1,
      a.address2,
      [a.city, a.state, a.zip].filter(Boolean).join(", "),
      a.country,
    ].filter(Boolean).join("\n");
  } catch { return raw; }
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts ?? {
    year: "numeric", month: "long", day: "numeric",
  });
}
function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function carrierTrackingUrl(carrier: string | null | undefined, trackingNumber: string): string {
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("ups"))   return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes("usps"))  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes("dhl"))   return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier ?? ""} tracking ${trackingNumber}`)}`;
}

const statusStyle: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50   text-amber-700   border-amber-200",
  PROCESSING: "bg-blue-50    text-blue-700    border-blue-200",
  SHIPPED:    "bg-indigo-50  text-indigo-700  border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50    text-teal-700    border-teal-200",
  CANCELLED:  "bg-red-50     text-red-700     border-red-200",
  REFUNDED:   "bg-orange-50  text-orange-700  border-orange-200",
};

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [order, shipments, notes] = await Promise.all([
    getOrderById(id),
    getOrderShipments(id),
    getOrderNotes(id),
  ]);
  if (!order) notFound();

  const items      = order.items as unknown as OrderItem[];
  const isReturned = !!order.returnedAt;
  const payStatus  = order.paymentStatus ?? "PENDING";

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

      <div className="max-w-6xl mx-auto">

        {/* ── Top nav ──────────────────────────────────────────────────── */}
        <div className="no-print flex items-center justify-between mb-5 gap-3 flex-wrap">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Order History
          </Link>
          <div className="flex items-center gap-2">
            {/* <PrintButton /> */}
          </div>
        </div>

        {/* ── Return banner ─────────────────────────────────────────────── */}
        {isReturned && (
          <div className="no-print mb-5 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-orange-700">
                Return processed — {fmtDate(order.returnedAt)}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-orange-600">
                {order.returnedTotal != null && (
                  <span>Returned: <strong>{fmtMoney(order.returnedTotal)}</strong></span>
                )}
                {(order.salesRepClawback ?? 0) > 0 && (
                  <span>Rep clawback: <strong>−{fmtMoney(order.salesRepClawback!)}</strong></span>
                )}
              </div>
              {order.returnReason && (
                <p className="mt-1 text-xs text-orange-400 italic">"{order.returnReason}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 items-start">

          {/* ════════ LEFT COLUMN ════════ */}
          <div className="space-y-4">

            {/* ── Shipping Label card ──────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Shipping Label</h3>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 001 1v10l2-1m7 1V7.5M16 7.5L13 6" />
                    </svg>
                  </div>
                  <div>
                    {order.trackingNumber ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800">
                          {items.length} item{items.length !== 1 ? "s" : ""} fulfilled
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.shippingCarrier && <span>{order.shippingCarrier} · </span>}
                          <span className="font-mono">{order.trackingNumber}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No shipment added yet</p>
                    )}
                  </div>
                </div>

                <div className="no-print flex items-center gap-2 shrink-0">
                  {!isReturned && (
                    <Link
                      href={`/admin/orders/${order.id}/shipment`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#3DBFA4] hover:bg-[#35a993] rounded-lg shadow-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 001 1v10l2-1m7 1V7.5M16 7.5L13 6" />
                      </svg>
                      View / Add Shipment
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* ── Order Details card ───────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Order {order.orderNumber} details</h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Payment via{" "}
                      <span className="font-medium text-gray-700">
                        {order.paymentMethod === "CARD" ? "Credit / Debit Card" : "Wallet Balance"}
                      </span>
                      {order.transactionId && (
                        <span className="ml-1 text-[11px] font-mono text-[#3DBFA4]"> · {order.transactionId}</span>
                      )}
                      {payStatus === "PAID" && (
                        <span className="ml-1"> · Paid on {fmtDateTime(order.updatedAt)}</span>
                      )}
                    </p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 border rounded-full text-xs font-semibold ${statusStyle[order.status]}`}>
                    {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* General / Billing / Shipping */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100">

                {/* General */}
                <div className="px-6 py-5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">General</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Date created:</p>
                      <p className="text-sm text-gray-700">{fmtDate(order.createdAt, { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 mb-1">Status:</p>
                      <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-semibold ${statusStyle[order.status]}`}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    {order.salesRep && (
                      <div>
                        <p className="text-[11px] text-gray-400 mb-0.5">Sales Rep:</p>
                        <p className="text-sm font-medium text-gray-700">{order.salesRep.name}</p>
                        <p className="text-xs text-gray-400">{order.salesRep.email}</p>
                      </div>
                    )}
                    {!order.salesRep && order.physician && (
                      <div>
                        <p className="text-[11px] text-gray-400 mb-0.5">Ordered by:</p>
                        <p className="text-sm text-gray-700"> (Direct)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing */}
                <div className="px-6 py-5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Billing</h4>
                  {order.physician ? (
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-gray-800">
                         {order.physician.firstName} {order.physician.lastName}
                      </p>
                      {order.physician.nameOfPractice && (
                        <p className="text-gray-600">{order.physician.nameOfPractice}</p>
                      )}
                      {physAddr && (
                        <p className="text-gray-500 text-xs leading-relaxed">{physAddr}</p>
                      )}
                      <p className="text-[#3DBFA4] text-xs mt-1">{order.physician.email}</p>
                      {order.physician.phone && (
                        <a href={`tel:${order.physician.phone}`} className="block text-xs text-[#3DBFA4] hover:underline">
                          {order.physician.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No billing info</p>
                  )}
                </div>

                {/* Shipping */}
                <div className="px-6 py-5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Shipping</h4>
                  {order.shippingAddress ? (
                    <div className="text-sm space-y-1">
                      {order.physician && (
                        <p className="font-semibold text-gray-800">
                           {order.physician.firstName} {order.physician.lastName}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs leading-relaxed whitespace-pre-wrap">{fmtAddress(order.shippingAddress)}</p>
                      {order.physician?.phone && (
                        <a href={`tel:${order.physician.phone}`} className="block text-xs text-[#3DBFA4] hover:underline">
                          {order.physician.phone}
                        </a>
                      )}
                    </div>
                  ) : order.physician ? (
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-gray-800">
                         {order.physician.firstName} {order.physician.lastName}
                      </p>
                      {physAddr && (
                        <p className="text-gray-500 text-xs leading-relaxed">{physAddr}</p>
                      )}
                      {order.physician.phone && (
                        <a href={`tel:${order.physician.phone}`} className="block text-xs text-[#3DBFA4] hover:underline">
                          {order.physician.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No shipping info</p>
                  )}
                </div>
              </div>

              {/* ── Items table ──────────────────────────────────────── */}
              <div className="px-6 py-5 border-b border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size / SKU</th>
                      <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
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
                          <td className="py-3.5 font-medium text-gray-800">
                            {item.title}
                            {isItemReturned && (
                              <span className="ml-2 text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                                Returned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-gray-500">
                            {item.variantSize || "—"}
                            {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                          </td>
                          <td className="py-3.5 text-center text-gray-700">{item.quantity}</td>
                          <td className="py-3.5 text-right text-gray-700">{fmtMoney(item.unitPrice)}</td>
                          <td className="py-3.5 text-right font-semibold text-gray-900">
                            {isItemReturned
                              ? <span className="line-through text-gray-300">{fmtMoney(item.lineTotal)}</span>
                              : fmtMoney(item.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                  <div className="flex justify-end gap-8">
                    <div className="w-48 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span><span>{fmtMoney(order.subtotal)}</span>
                      </div>
                      {(order.discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-medium">
                          <span className="flex items-center gap-1">
                            Coupon
                            {order.couponCode && (
                              <span className="font-mono text-[11px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-700">
                                {order.couponCode}
                              </span>
                            )}
                          </span>
                          <span>−{fmtMoney(order.discountAmount ?? 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Shipping</span>
                        <span>
                          {(() => {
                            const stored  = order.shippingRate ?? 0;
                            // If stored rate is 0 but total > subtotal - discount, recover the implied amount
                            const implied = parseFloat((order.total - order.subtotal + (order.discountAmount ?? 0)).toFixed(2));
                            const display = stored > 0 ? stored : implied > 0 ? implied : 0;
                            return display === 0
                              ? <span className="text-[#3DBFA4] font-medium">Free</span>
                              : fmtMoney(display);
                          })()}
                        </span>
                      </div>
                      {isReturned && order.returnedTotal != null && (
                        <div className="flex justify-between text-sm text-orange-500 font-medium">
                          <span>Returned</span><span>−{fmtMoney(order.returnedTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Order Total</span>
                        <span>
                          {isReturned && order.returnedTotal != null
                            ? fmtMoney(order.total - order.returnedTotal)
                            : fmtMoney(order.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Order Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>

            {/* ── Commission summary ───────────────────────────────────── */}
            <div className="no-print grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Order Total</p>
                <p className="text-xl font-bold text-gray-800">{fmtMoney(order.total)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-2 border-l-[#5BB8D4]">
                <p className="text-xs text-gray-400 font-medium mb-1">Rep Commission</p>
                <p className="text-xl font-bold text-[#5BB8D4]">{fmtMoney(order.salesRepCommissionAmount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{order.salesRepCommissionRate}%</p>
                {(order.salesRepClawback ?? 0) > 0 && (
                  <p className="text-xs text-orange-500 font-medium mt-0.5">−{fmtMoney(order.salesRepClawback!)} clawed back</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-2 border-l-[#8b5cf6]">
                <p className="text-xs text-gray-400 font-medium mb-1"> Commission</p>
                <p className="text-xl font-bold text-[#8b5cf6]">{fmtMoney(order.physicianCommissionAmount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{order.physicianCommissionRate}%</p>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT SIDEBAR ════════ */}
          <div className="no-print space-y-4 lg:sticky lg:top-6">

            {/* Send Order Email */}
            <SendOrderEmailPanel orderId={id} />

            {/* Shipment Tracking */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Shipment Tracking</h3>
              </div>
              <div className="p-4">
                {order.trackingNumber ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      {fmtDate(order.updatedAt, { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#3DBFA4]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 001 1v10l2-1m7 1V7.5M16 7.5L13 6" />
                        </svg>
                      </div>
                      <div>
                        <a
                          href={carrierTrackingUrl(order.shippingCarrier, order.trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono font-semibold text-[#3DBFA4] hover:underline inline-flex items-center gap-1"
                        >
                          {order.trackingNumber}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {order.shippingCarrier && (
                          <p className="text-xs text-gray-400 mt-0.5">({order.shippingCarrier})</p>
                        )}
                        {order.estimatedDelivery && (
                          <p className="text-xs text-gray-400 mt-1">
                            Est. delivery: {fmtDate(order.estimatedDelivery, { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No tracking info yet</p>
                )}
              </div>
            </div>

            {/* Order Actions */}
            <OrderActionsPanel
              orderId={id}
              current={order.status}
              isReturned={isReturned}
            />

            {/* Return action */}
            {!isReturned && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <ReturnOrderModal />
              </div>
            )}

            {/* Order Notes */}
            <OrderNotesPanel orderId={id} initialNotes={notes} />
          </div>
        </div>
      </div>
    </>
  );
}
