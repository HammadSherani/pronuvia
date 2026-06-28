import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePhysician } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PrintButton } from "@/components/sales/print-button";

type Props = { params: Promise<{ orderNumber: string }> };

type OrderItem = {
  productId:   string;
  title:       string;
  variantSize: string;
  sku:         string;
  unitPrice:   number;
  quantity:    number;
  lineTotal:   number;
};

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type AddrObj = { firstName?: string; lastName?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string; country?: string };
function fmtAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const a: AddrObj = JSON.parse(raw);
    return [
      [a.firstName, a.lastName].filter(Boolean).join(" "),
      a.address1, a.address2,
      [a.city, a.state, a.zip].filter(Boolean).join(", "),
      a.country,
    ].filter(Boolean).join("\n");
  } catch { return raw; }
}

function fmtDate(d: Date | string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50  text-amber-700  border-amber-200",
  FAILED:  "bg-red-50    text-red-700    border-red-200",
};

export default async function PhysicianInvoicePage({ params }: Props) {
  const session = await requirePhysician();
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where:  { orderNumber },
    select: {
      id: true, orderNumber: true, createdAt: true,
      paymentMethod: true, paymentStatus: true, transactionId: true,
      subtotal: true, total: true, shippingRate: true,
      couponCode: true, discountAmount: true,
      shippingCarrier: true, trackingNumber: true,
      billingAddress: true, shippingAddress: true, estimatedDelivery: true,
      notes: true, items: true,
      physicianId: true,
      physician: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
    },
  });

  if (!order || order.physicianId !== session.userId) notFound();

  const items     = order.items as unknown as OrderItem[];
  const payStatus = order.paymentStatus ?? "PENDING";
  const statusCls = STATUS_STYLES[payStatus] ?? STATUS_STYLES["PENDING"];

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="max-w-3xl mx-auto">
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between mb-6">
          <Link href="/physician/orders"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Order History
          </Link>
          <PrintButton />
        </div>

        {/* Invoice card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#3DBFA4] to-[#35a993] px-8 py-7 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight">PRONUVIA</p>
                <p className="text-sm text-white/70 mt-0.5">Health & Wellness Products</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 uppercase tracking-wider">Invoice</p>
                <p className="text-xl font-bold font-mono mt-0.5">{order.orderNumber}</p>
                <p className="text-xs text-white/70 mt-1">{fmtDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-white ${statusCls}`}>
                {payStatus === "PAID" && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {payStatus}
              </span>
              {order.paymentMethod && (
                <span className="text-xs text-white/80 font-medium">
                  {order.paymentMethod === "CARD" ? "ðŸ’³ Credit / Debit Card" : "ðŸ‘› Wallet Balance"}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">

            {order.transactionId && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</p>
                  <p className="text-sm font-mono font-medium text-gray-800 mt-0.5 break-all">{order.transactionId}</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
                {order.billingAddress ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{fmtAddress(order.billingAddress)}</p>
                ) : order.physician ? (
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <p className="font-semibold">{order.physician.firstName} {order.physician.lastName}</p>
                    <p className="text-gray-500">{order.physician.email}</p>
                    {order.physician.phone && <p className="text-gray-500">{order.physician.phone}</p>}
                  </div>
                ) : <p className="text-sm text-gray-400">-</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ship To</p>
                {order.shippingAddress ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{fmtAddress(order.shippingAddress)}</p>
                ) : (
                  <p className="text-sm text-gray-400">No shipping address provided.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <InfoBox
                label="Shipping / Tracking"
                value={order.trackingNumber
                  ? `${order.shippingCarrier ?? ""} · ${order.trackingNumber}`
                  : "Awaiting shipment"}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
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
                label="Order Date"
                value={new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

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
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3.5 font-medium text-gray-800">{item.title}</td>
                      <td className="px-4 py-3.5 text-gray-500">
                        {item.variantSize || "-"}
                        {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-gray-700">{fmtMoney(item.unitPrice)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{fmtMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmtMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>
                    {(() => {
                      const stored  = order.shippingRate ?? 0;
                      const implied = parseFloat((order.total - order.subtotal + (order.discountAmount ?? 0)).toFixed(2));
                      const display = stored > 0 ? stored : implied > 0 ? implied : 0;
                      return display === 0
                        ? <span className="text-[#3DBFA4] font-medium">Free</span>
                        : fmtMoney(display);
                    })()}
                  </span>
                </div>
                {order.couponCode && (order.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Coupon
                      <span className="font-mono font-semibold tracking-wide">{order.couponCode}</span>
                    </span>
                    <span className="font-semibold">âˆ’{fmtMoney(order.discountAmount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Paid</span>
                  <span>{fmtMoney(order.total)}</span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

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
