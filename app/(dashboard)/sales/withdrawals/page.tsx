import { requireSalesRep } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata = { title: "Withdrawal History – Pronuvia" };

const statusStyle: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function SalesWithdrawalsPage() {
  const session = await requireSalesRep();

  const [rep, requests] = await Promise.all([
    prisma.salesRepresentative.findUnique({
      where:  { id: session.userId },
      select: { walletBalance: true, bankName: true },
    }),
    prisma.withdrawRequest.findMany({
      where:   { userId: session.userId, userRole: "SALES_REP" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const balance     = rep?.walletBalance ?? 0;
  const hasPending  = requests.some((r) => r.status === "PENDING");
  const totalPaid   = requests.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Withdrawal Requests</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your withdrawal request history and status</p>
        </div>
        {!hasPending && (
          <Link
            href="/sales/withdrawals/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3DBFA4] hover:bg-[#35a993] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Wallet Balance",    value: fmt(balance),   color: "#3DBFA4" },
          { label: "Total Withdrawn",   value: fmt(totalPaid), color: "#5BB8D4" },
          { label: "Total Requests",    value: String(requests.length), color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className="text-xl font-bold text-gray-800">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {!rep?.bankName && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-2.194-.834-2.964 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Bank details not set</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Add your bank details in{" "}
              <Link href="/sales/account" className="underline font-medium">Account Settings</Link>
              {" "}before requesting a withdrawal.
            </p>
          </div>
        </div>
      )}

      {hasPending && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <p className="text-sm font-medium text-blue-700">
            You have a pending request. You can submit a new one once it is processed.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No withdrawal requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Your requests will appear here once submitted.</p>
            {rep?.bankName && (
              <Link href="/sales/withdrawals/new" className="mt-4 text-sm text-[#3DBFA4] hover:underline font-medium">
                Submit your first request →
              </Link>
            )}
          </div>
        ) : (
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
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-800">{fmt(r.amount)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500 italic max-w-[200px]">
                    {r.note ?? <span className="text-gray-300 not-italic">—</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#5BB8D4] max-w-[200px]">
                    {r.adminNote ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 border rounded-full text-xs font-semibold ${statusStyle[r.status] ?? statusStyle.PENDING}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
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
