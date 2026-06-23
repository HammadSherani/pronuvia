"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { PhysicianWithdrawalActions } from "@/components/admin/physician-withdrawal-actions";
import { PhysicianWalletModal }       from "@/components/admin/physician-wallet-modal";
import { bulkUpdatePhysicianWithdrawals } from "@/actions/admin/manage-physician-withdrawals";
import { WithdrawStatus } from "@/generated/prisma/enums";

type Request = {
  id:          string;
  amount:      number;
  status:      WithdrawStatus;
  note:        string | null;
  adminNote:   string | null;
  createdAt:   Date;
  physicianId: string;
  physician: {
    firstName:         string;
    lastName:          string;
    email:             string;
    bankName:          string | null;
    bankAccountNumber: string | null;
    bankAccountName:   string | null;
    walletBalance:     number;
  };
};

const statusStyle: Record<WithdrawStatus, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PhysicianWithdrawalsTableClient({ requests }: { requests: Request[] }) {
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [isPending,     startTransition]  = useTransition();

  const pendingIds  = requests.filter((r) => r.status === "PENDING").map((r) => r.id);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const toggle    = (id: string) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pendingIds));

  const handleBulk = (action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await bulkUpdatePhysicianWithdrawals([...selected], action);
      if (res.success) { toast.success(res.message); setSelected(new Set()); }
      else { toast.error(res.message); }
      setConfirmAction(null);
    });
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">No withdrawal requests yet</p>
      </div>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-4 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-800">
            {selected.size} request{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setConfirmAction("APPROVED")} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve All
            </button>
            <button type="button" onClick={() => setConfirmAction("REJECTED")} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject All
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline">Clear</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3.5">
                {pendingIds.length > 0 && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    title="Select all pending"
                    className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4] cursor-pointer" />
                )}
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Physician</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet Balance</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.map((r) => {
              const rowPending = r.status === "PENDING";
              const isChecked  = selected.has(r.id);
              return (
                <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${isChecked ? "bg-blue-50/40" : ""}`}>
                  <td className="px-4 py-4">
                    {rowPending
                      ? <input type="checkbox" checked={isChecked} onChange={() => toggle(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4] cursor-pointer" />
                      : <span className="block w-4 h-4" />}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#3DBFA4]">
                          {r.physician.firstName[0]}{r.physician.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">Dr. {r.physician.firstName} {r.physician.lastName}</p>
                        <p className="text-xs text-gray-400">{r.physician.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {r.physician.bankName ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{r.physician.bankAccountName}</p>
                        <p className="text-xs text-gray-500">{r.physician.bankName}</p>
                        {r.physician.bankAccountNumber && (
                          <p className="text-xs font-mono font-semibold text-gray-700 mt-0.5">{r.physician.bankAccountNumber}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-red-400 font-medium">No bank linked</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-base font-black text-gray-800">{fmt(r.amount)}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${r.physician.walletBalance >= r.amount ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(r.physician.walletBalance)}
                    </span>
                    {r.physician.walletBalance < r.amount && r.status === "PENDING" && (
                      <p className="text-[10px] text-red-400 mt-0.5">Insufficient</p>
                    )}
                  </td>

                  <td className="px-5 py-4 max-w-[160px]">
                    {r.note
                      ? <p className="text-xs text-gray-500 italic truncate" title={r.note}>"{r.note}"</p>
                      : <span className="text-gray-300 text-xs">—</span>}
                    {r.adminNote && (
                      <p className="text-xs text-[#3DBFA4] mt-0.5 truncate" title={r.adminNote}>↳ {r.adminNote}</p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${statusStyle[r.status]}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <PhysicianWalletModal physicianId={r.physicianId} physicianName={`${r.physician.firstName} ${r.physician.lastName}`} />
                  </td>

                  <td className="px-5 py-4">
                    {r.status === "PENDING"
                      ? <PhysicianWithdrawalActions requestId={r.id} />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {confirmAction === "APPROVED" ? "Bulk Approve" : "Bulk Reject"} {selected.size} Request{selected.size !== 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction === "APPROVED"
                ? "Amounts will be deducted from each physician's wallet balance."
                : "All selected requests will be marked as rejected."}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} disabled={isPending}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => handleBulk(confirmAction)} disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
                  confirmAction === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                }`}>
                {isPending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : confirmAction === "APPROVED" ? "Approve All" : "Reject All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
