import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { WithdrawalActions } from "@/components/admin/withdrawal-actions";
import { WithdrawStatus } from "@/app/generated/prisma/enums";

export const metadata = { title: "Withdrawal Requests – Pronuvia Admin" };

const statusStyle: Record<WithdrawStatus, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function WithdrawalsPage() {
  await requireAdmin();

  const requests = await prisma.withdrawRequest.findMany({
    include: {
      salesRep: {
        select: {
          firstName: true, lastName: true, email: true,
          bankName: true, bankAccountNumber: true, bankAccountName: true,
          walletBalance: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending  = requests.filter((r) => r.status === "PENDING").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const totalApprovedAmt = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Withdrawal Requests"
        description="Review and process sales rep wallet withdrawal requests"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Pending Review", value: pending,              color: "#f59e0b", text: "text-amber-600" },
          { label: "Approved",       value: approved,             color: "#10b981", text: "text-emerald-600" },
          { label: "Total Paid Out", value: fmt(totalApprovedAmt), color: "#3DBFA4", text: "text-[#3DBFA4]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No withdrawal requests yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Rep</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet Balance</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Sales rep */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#3DBFA4]">
                          {r.salesRep.firstName[0]}{r.salesRep.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">
                          {r.salesRep.firstName} {r.salesRep.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{r.salesRep.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Bank details */}
                  <td className="px-5 py-4">
                    {r.salesRep.bankName ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{r.salesRep.bankAccountName}</p>
                        <p className="text-xs text-gray-400">{r.salesRep.bankName}</p>
                        {r.salesRep.bankAccountNumber && (
                          <p className="text-xs text-gray-400 font-mono">
                            ••••&nbsp;{r.salesRep.bankAccountNumber.slice(-4)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-red-400 font-medium">No bank linked</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-5 py-4">
                    <span className="text-base font-black text-gray-800">{fmt(r.amount)}</span>
                  </td>

                  {/* Wallet balance */}
                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${
                      (r.salesRep.walletBalance ?? 0) >= r.amount
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}>
                      {fmt(r.salesRep.walletBalance ?? 0)}
                    </span>
                    {(r.salesRep.walletBalance ?? 0) < r.amount && r.status === "PENDING" && (
                      <p className="text-[10px] text-red-400 mt-0.5">Insufficient</p>
                    )}
                  </td>

                  {/* Note */}
                  <td className="px-5 py-4 max-w-[160px]">
                    {r.note ? (
                      <p className="text-xs text-gray-500 italic truncate" title={r.note}>
                        "{r.note}"
                      </p>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                    {r.adminNote && (
                      <p className="text-xs text-[#3DBFA4] mt-0.5 truncate" title={r.adminNote}>
                        ↳ {r.adminNote}
                      </p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${statusStyle[r.status]}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    {r.status === "PENDING" ? (
                      <WithdrawalActions requestId={r.id} />
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
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
