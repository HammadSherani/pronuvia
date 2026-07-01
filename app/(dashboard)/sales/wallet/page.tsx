import { requireSalesRep } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { WalletPanel } from "@/components/sales/wallet-panel";

export const metadata = { title: "Wallet – Pronuvia" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const wdStatusStyle: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default async function WalletPage() {
  const session = await requireSalesRep();

  const [rep, earningOrders, withdrawRequests, adminTxns] = await Promise.all([
    prisma.salesRepresentative.findUnique({
      where:  { id: session.userId },
      select: {
        walletBalance:     true,
        firstName:         true,
        lastName:          true,
        bankName:          true,
        bankAccountNumber: true,
        bankAccountName:   true,
      },
    }),

    prisma.order.findMany({
      where:   { salesRepId: session.userId },
      select: {
        id:                       true,
        orderNumber:              true,
        createdAt:                true,
        status:                   true,
        commissionPaid:           true,
        salesRepCommissionRate:   true,
        salesRepCommissionAmount: true,
        physicianId:              true,
        physician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.withdrawRequest.findMany({
      where:   { userId: session.userId, userRole: "SALES_REP" },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),

    prisma.walletTransaction.findMany({
      where: {
        userId:      session.userId,
        userRole:    "SALES_REP",
        description: { startsWith: "Admin adjustment:" },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);



  const balance          = rep?.walletBalance ?? 0;
  const hasPending       = withdrawRequests.some((r) => r.status === "PENDING");

  const paidOrders       = earningOrders.filter((o) => o.commissionPaid);
  const pendingOrders    = earningOrders.filter((o) => !o.commissionPaid);

  // Merge orders + admin adjustments sorted by date desc (newest first)
  type EarningEntry =
    | { kind: "order"; data: (typeof earningOrders)[number] }
    | { kind: "txn";   data: (typeof adminTxns)[number] };

  const allEntries: EarningEntry[] = [
    ...earningOrders.map((o) => ({ kind: "order" as const, data: o })),
    ...adminTxns.map((t)     => ({ kind: "txn"   as const, data: t })),
  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

  const totalPaid        = paidOrders.reduce((s, o) => s + (o.salesRepCommissionAmount ?? 0), 0);
  const totalPending     = pendingOrders.reduce((s, o) => s + (o.salesRepCommissionAmount ?? 0), 0);

  const totalWithdrawn   = withdrawRequests
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-6xl">
      <div className="mb-7">
        <h1 className="text-xl font-bold text-gray-800">Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue performance and earnings overview</p>
      </div>

      <WalletPanel
        balance={balance}
        totalPaid={totalPaid}
        totalPending={totalPending}
        totalWithdrawn={totalWithdrawn}
        commissionOrderCount={earningOrders.length}
        hasPending={hasPending}
        bankName={rep?.bankName}
        bankAccountNumber={rep?.bankAccountNumber}
        bankAccountName={rep?.bankAccountName}
      />

      {/* ── Earning History Table ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Earning History</h2>
          <div className="flex items-center gap-3">
            {pendingOrders.length > 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                {pendingOrders.length} pending commission{pendingOrders.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs text-gray-400">{earningOrders.length} orders</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {earningOrders.length === 0 && adminTxns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No earnings yet</p>
              <p className="text-xs text-gray-400 mt-1">Commission earnings will appear here once orders are placed.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Number</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Source</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission Applied</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Earnings</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allEntries.map((entry) => {
                  if (entry.kind === "order") {
                    const o          = entry.data;
                    const isDoctor   = !!o.physicianId;
                    const doctorName = o.physician
                      ? ` ${o.physician.firstName} ${o.physician.lastName}`
                      : "Doctor";
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                            #{o.orderNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {isDoctor ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-900/15 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-[#5BB8D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span className="text-xs font-medium text-gray-700">{doctorName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-900/15 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <span className="text-xs font-medium text-gray-700">Myself</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4"><span className="text-gray-300 text-xs">—</span></td>
                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold">
                            {o.salesRepCommissionRate}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`text-sm font-bold ${o.commissionPaid ? "text-emerald-600" : "text-gray-400"}`}>
                            {fmt(o.salesRepCommissionAmount ?? 0)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {o.commissionPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Paid to Wallet
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  // Admin adjustment row
                  const t        = entry.data;
                  const isCredit = t.type === "CREDIT";
                  const note     = t.description?.replace("Admin adjustment:", "").trim() ?? "";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors bg-blue-50/20">
                      <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Admin
                        </span>
                      </td>
                      <td className="px-5 py-4"><span className="text-gray-300 text-xs">—</span></td>
                      <td className="px-5 py-4 max-w-[180px]">
                        {note
                          ? <p className="text-xs text-gray-700 line-clamp-2" title={note}>{note}</p>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-xs text-gray-300">—</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-bold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                          {isCredit ? "+" : "-"}{fmt(t.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-xs font-medium ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {isCredit ? "Credited" : "Debited"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer */}
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/60">
                  <td colSpan={5} className="px-5 py-3.5 text-xs font-bold text-gray-500 text-right">
                    Paid to Wallet
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-black text-emerald-600">{fmt(totalPaid)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {totalPending > 0 && (
                      <span className="text-xs text-amber-600 font-medium">{fmt(totalPending)} pending</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ── Withdrawal Request History ── */}
      {withdrawRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Withdrawal Requests</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Reply</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawRequests.map((r) => {
                  const cls = wdStatusStyle[r.status] ?? wdStatusStyle["PENDING"];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{fmt(r.amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 italic max-w-[180px] truncate">
                        {r.note ?? <span className="text-gray-300 not-italic">—</span>}
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        {r.adminNote ? (
                          <div>
                            <span className="inline-block text-[9px] font-bold uppercase tracking-wide text-[#3DBFA4] bg-gray-900/10 border border-gray-900/30 px-1.5 py-0.5 rounded mb-0.5">
                              Admin
                            </span>
                            <p className="text-xs text-gray-700 line-clamp-2 leading-snug" title={r.adminNote}>
                              {r.adminNote}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${cls}`}>
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
