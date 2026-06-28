"use client";

import { useState, useMemo, useTransition } from "react";
import toast from "react-hot-toast";
import { WithdrawStatus } from "@/generated/prisma/enums";
import { updateWithdrawRequest, bulkUpdateWithdrawals } from "@/actions/admin/manage-withdrawals";
import { RepWalletModal }       from "@/components/admin/rep-wallet-modal";
import { PhysicianWalletModal } from "@/components/admin/physician-wallet-modal";
import { ClientPagination } from "@/components/shared/pagination";

type Request = {
  id:        string;
  userId:    string;
  userRole:  string;
  amount:    number;
  status:    WithdrawStatus;
  note:      string | null;
  adminNote: string | null;
  createdAt: Date;
};

type UserInfo = {
  id:                string;
  firstName:         string;
  lastName:          string;
  email:             string;
  bankName:          string | null;
  bankAccountNumber: string | null;
  bankAccountName:   string | null;
  walletBalance:     number | null;
};

interface Props {
  requests: Request[];
  repMap:   Map<string, UserInfo>;
  drMap:    Map<string, UserInfo>;
}

const statusStyle: Record<WithdrawStatus, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function RowActions({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open,      setOpen]         = useState(false);
  const [adminNote, setAdminNote]    = useState("");
  const [action,    setAction]       = useState<"APPROVED" | "REJECTED" | null>(null);

  const confirm = (a: "APPROVED" | "REJECTED") => { setAction(a); setOpen(true); };

  const handle = () => {
    startTransition(async () => {
      const res = await updateWithdrawRequest(requestId, action!, adminNote);
      if (res?.success) { toast.success(res.message ?? "Done"); setOpen(false); setAdminNote(""); }
      else              { toast.error(res?.message ?? "Failed"); }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" onClick={() => confirm("APPROVED")} disabled={isPending} title="Approve"
          className="w-7 h-7 inline-flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button type="button" onClick={() => confirm("REJECTED")} disabled={isPending} title="Reject"
          className="w-7 h-7 inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {open && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {action === "APPROVED" ? "Approve" : "Reject"} Withdrawal
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {action === "APPROVED" ? "Amount will be deducted from the wallet." : "Request will be marked as rejected."}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Note <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason or message…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/40 focus:border-gray-900 resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setOpen(false); setAdminNote(""); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handle} disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
                  action === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                }`}>
                {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : action === "APPROVED" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AllWithdrawalsTable({ requests, repMap, drMap }: Props) {
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [isPending,     startTransition]  = useTransition();
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(10);

  const pendingIds  = requests.filter((r) => r.status === "PENDING").map((r) => r.id);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const toggle    = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pendingIds));

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, page, pageSize]);

  const handleBulk = (action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await bulkUpdateWithdrawals([...selected], action);
      if (res.processed > 0) toast.success(res.message);
      else toast.error(res.message);
      setSelected(new Set());
      setConfirmAction(null);
    });
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
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
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-3 py-3">
                {pendingIds.length > 0 && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} title="Select all pending"
                    className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                )}
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Wallet</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedRequests.map((r) => {
              const isRep       = r.userRole === "SALES_REP";
              const user        = isRep ? repMap.get(r.userId) : drMap.get(r.userId);
              const isPendingRow = r.status === "PENDING";
              const isChecked   = selected.has(r.id);

              return (
                <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${isChecked ? "bg-blue-50/40" : ""}`}>
                  <td className="px-3 py-3">
                    {isPendingRow
                      ? <input type="checkbox" checked={isChecked} onChange={() => toggle(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                      : <span className="block w-4 h-4" />}
                  </td>

                  <td className="px-3 py-3">
                    {isRep ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900/10 text-[#3DBFA4] border border-gray-900/30 whitespace-nowrap">
                        Sales Rep
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 whitespace-nowrap">
                        Doctor
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {user ? (
                      <>
                        <p className="font-semibold text-gray-800 text-xs truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                      </>
                    ) : <span className="text-xs text-gray-300">Unknown</span>}
                  </td>

                  <td className="px-3 py-3">
                    {user?.bankName ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate">{user.bankAccountName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user.bankName}</p>
                        {user.bankAccountNumber && <p className="text-[11px] font-mono text-gray-600 truncate">{user.bankAccountNumber}</p>}
                      </div>
                    ) : <span className="text-xs text-red-400 font-medium">No bank</span>}
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-sm font-bold text-gray-800">{fmt(r.amount)}</span>
                  </td>

                  <td className="px-3 py-3">
                    <span className={`text-xs font-semibold ${(user?.walletBalance ?? 0) >= r.amount ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(user?.walletBalance ?? 0)}
                    </span>
                    {(user?.walletBalance ?? 0) < r.amount && isPendingRow && (
                      <p className="text-[10px] text-red-400">Low</p>
                    )}
                  </td>

                  <td className="px-3 py-3 space-y-1">
                    {r.note
                      ? <p className="text-[11px] text-gray-500 italic line-clamp-2" title={r.note}>"{r.note}"</p>
                      : <span className="text-gray-300 text-xs">—</span>}
                    {r.adminNote && (
                      <div className="mt-1">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wide text-[#3DBFA4] bg-gray-900/10 border border-gray-900/30 px-1.5 py-0.5 rounded mb-0.5">
                          Admin
                        </span>
                        <p className="text-[11px] text-gray-700 line-clamp-2 leading-snug" title={r.adminNote}>
                          {r.adminNote}
                        </p>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3 text-[11px] text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>

                  <td className="px-3 py-3">
                    <span className={`inline-flex px-1.5 py-0.5 border rounded-full text-[11px] font-medium ${statusStyle[r.status]}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {isRep
                      ? <RepWalletModal salesRepId={r.userId} repName={user ? `${user.firstName} ${user.lastName}` : r.userId} />
                      : <PhysicianWalletModal physicianId={r.userId} physicianName={user ? `${user.firstName} ${user.lastName}` : r.userId} />}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {isPendingRow
                      ? <RowActions requestId={r.id} />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ClientPagination
          total={requests.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {confirmAction === "APPROVED" ? "Bulk Approve" : "Bulk Reject"} {selected.size} Request{selected.size !== 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction === "APPROVED"
                ? "Amounts will be deducted from each wallet balance."
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
                {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : confirmAction === "APPROVED" ? "Approve All" : "Reject All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
