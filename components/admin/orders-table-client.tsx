"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { OrderStatus } from "@/generated/prisma/enums";
import { bulkCompleteOrders } from "@/actions/admin/manage-orders";

type Order = {
  id:             string;
  orderNumber:    string;
  status:         OrderStatus;
  total:          number;
  createdAt:      Date;
  returnedAt:     Date | null;
  placedByAdmin:    boolean | null;
  placedBySalesRep: boolean;
  commissionPaid:   boolean;
  shippingAddress:  string | null;
  customerEmail:    string | null;
  physician:      { firstName: string; lastName: string; email: string } | null;
  salesRep:       { name: string; email: string } | null;
};

function patientName(shippingAddress: string | null): string | null {
  if (!shippingAddress) return null;
  try {
    const a = JSON.parse(shippingAddress) as { firstName?: string; lastName?: string };
    const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
    return name || null;
  } catch { return null; }
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

// Orders eligible for bulk-complete (commission not yet released)
const COMPLETABLE = new Set<OrderStatus>([
  OrderStatus.PENDING, OrderStatus.PROCESSING,
  OrderStatus.SHIPPED, OrderStatus.DELIVERED,
]);

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function OrdersTableClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [isPending,  startTransition] = useTransition();

  const completableIds = orders
    .filter((o) => COMPLETABLE.has(o.status) && !o.commissionPaid)
    .map((o) => o.id);

  const allCompletableSelected =
    completableIds.length > 0 &&
    completableIds.every((id) => selected.has(id));

  function toggleRow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelected(new Set(completableIds));
    } else {
      setSelected(new Set());
    }
  }

  function handleBulkComplete() {
    if (!selected.size) return;
    const ids = [...selected];
    startTransition(async () => {
      const res = await bulkCompleteOrders(ids);
      if (res?.success) {
        toast.success(res.message ?? "Orders marked as Completed.");
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(res?.message ?? "Bulk action failed.");
      }
    });
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No orders yet</p>
        <p className="text-xs text-gray-400 mt-1">Orders placed by sales reps or doctors will appear here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 bg-teal-50 border-b border-teal-100">
          <span className="text-sm font-semibold text-teal-800">
            {selected.size} order{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleBulkComplete}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isPending ? "Processing…" : "Mark as Completed"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-teal-600 hover:text-teal-800 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {/* Select-all checkbox — only enabled when there are completable rows */}
              <th className="pl-5 pr-2 py-3.5 w-8">
                {completableIds.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allCompletableSelected}
                    onChange={toggleSelectAll}
                    title="Select all completable orders on this page"
                    className="w-4 h-4 rounded border-gray-300 accent-teal-600 cursor-pointer"
                  />
                )}
              </th>
              {["Order", "Date", "Status", "Total", "Origin"].map((h) => (
                <th key={h}
                  className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => {
              const isReturned   = !!o.returnedAt;
              const isCompletable = COMPLETABLE.has(o.status) && !o.commissionPaid;
              const isChecked    = selected.has(o.id);
              return (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  className={`hover:bg-gray-900/5 transition-colors cursor-pointer select-none ${isReturned ? "opacity-60" : ""} ${isChecked ? "bg-teal-50/60" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="pl-5 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                    {isCompletable && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => toggleRow(o.id, e)}
                        className="w-4 h-4 rounded border-gray-300 accent-teal-600 cursor-pointer"
                      />
                    )}
                  </td>

                  {/* ── Order # + physician + emails ── */}
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          <span className="text-gray-400 font-normal text-xs">ORDER#</span> {o.orderNumber}
                          {o.physician ? (
                            <span className="font-normal text-gray-500"> · {o.physician.firstName} {o.physician.lastName}</span>
                          ) : (patientName(o.shippingAddress) ?? o.salesRep?.name) ? (
                            <span className="font-normal text-gray-500"> · {patientName(o.shippingAddress) ?? o.salesRep?.name}</span>
                          ) : null}
                        </p>

                        {/* Emails */}
                        <div className="mt-1 space-y-0.5">
                          {o.customerEmail && (
                            <p className="text-[11px] text-gray-400 leading-none">
                              <span className="font-medium text-gray-500">Patient:</span>{" "}
                              <a href={`mailto:${o.customerEmail}`} onClick={e => e.stopPropagation()}
                                className="hover:text-gray-700 hover:underline transition-colors">{o.customerEmail}</a>
                            </p>
                          )}
                          {o.physician?.email && (
                            <p className="text-[11px] text-gray-400 leading-none">
                              <span className="font-medium text-gray-500">Dr:</span>{" "}
                              <a href={`mailto:${o.physician.email}`} onClick={e => e.stopPropagation()}
                                className="hover:text-gray-700 hover:underline transition-colors">{o.physician.email}</a>
                            </p>
                          )}
                          {o.salesRep?.email && (
                            <p className="text-[11px] text-gray-400 leading-none">
                              <span className="font-medium text-gray-500">Rep:</span>{" "}
                              <a href={`mailto:${o.salesRep.email}`} onClick={e => e.stopPropagation()}
                                className="hover:text-gray-700 hover:underline transition-colors">{o.salesRep.email}</a>
                            </p>
                          )}
                        </div>

                        {isReturned && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-semibold rounded-full border border-orange-200">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            Returned
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ── Date ── */}
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>

                  {/* ── Status ── */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 border rounded-full text-xs font-semibold ${statusBadge[o.status]}`}>
                      {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* ── Total ── */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-gray-800">{fmt(o.total)}</span>
                  </td>

                  {/* ── Origin ── */}
                  <td className="px-4 py-4">
                    {o.placedByAdmin ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Admin
                      </span>
                    ) : o.placedBySalesRep && o.physician ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-900/10 text-[#3DBFA4] border border-gray-900/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                        Sales Rep (for Doctor)
                      </span>
                    ) : o.placedBySalesRep ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        Sales Rep (Self)
                      </span>
                    ) : o.physician ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Doctor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        Sales Rep (Self)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
