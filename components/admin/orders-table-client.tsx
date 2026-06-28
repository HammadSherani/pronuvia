"use client";

import { useRouter } from "next/navigation";
import { OrderStatus } from "@/generated/prisma/enums";

type Order = {
  id:            string;
  orderNumber:   string;
  status:        OrderStatus;
  total:         number;
  createdAt:     Date;
  returnedAt:    Date | null;
  placedByAdmin: boolean | null;
  physician:     { firstName: string; lastName: string } | null;
  salesRep:      { name: string } | null;
};

const statusBadge: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-50   text-amber-700   border-amber-200",
  PROCESSING: "bg-blue-50    text-blue-700    border-blue-200",
  SHIPPED:    "bg-indigo-50  text-indigo-700  border-indigo-200",
  DELIVERED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-teal-50    text-teal-700    border-teal-200",
  CANCELLED:  "bg-red-50     text-red-700     border-red-200",
  REFUNDED:   "bg-orange-50  text-orange-700  border-orange-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function OrdersTableClient({ orders }: { orders: Order[] }) {
  const router = useRouter();

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
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Orders placed by sales reps or doctors will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40">
            {["Order", "Date", "Status", "Total", "Origin"].map((h) => (
              <th key={h}
                className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
          {orders.map((o) => {
            const isReturned = !!o.returnedAt;
            return (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none ${isReturned ? "opacity-60" : ""}`}
              >
                {/* -- Order # + physician -- */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {o.orderNumber}
                        {o.physician
                          ? <span className="font-normal text-gray-500"> · Dr. {o.physician.firstName} {o.physician.lastName}</span>
                          : null}
                      </p>
                      {isReturned && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-semibold rounded-full border border-orange-200">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                          </svg>
                          Returned
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* -- Date -- */}
                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(o.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </td>

                {/* -- Status -- */}
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2.5 py-0.5 border rounded-full text-xs font-semibold ${statusBadge[o.status]}`}>
                    {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                  </span>
                </td>

                {/* -- Total -- */}
                <td className="px-5 py-4">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmt(o.total)}</span>
                </td>

                {/* -- Origin -- */}
                <td className="px-5 py-4">
                  {o.placedByAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Admin
                    </span>
                  ) : o.salesRep ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-900/10 text-[#3DBFA4] border border-gray-900/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      Sales Rep
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Doctor
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
