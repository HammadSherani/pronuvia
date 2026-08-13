"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateWithdrawRequest, deleteWithdrawRequest } from "@/actions/admin/manage-withdrawals";

type OrderRow = { orderNumber: string; createdAt: string; amount: number; rate: number };
type UserInfo = {
  firstName:         string;
  lastName:          string;
  email:             string;
  bankName:          string | null;
  bankAccountNumber: string | null;
  bankAccountName:   string | null;
};

export type PendingRow = {
  id:       string;
  userId:   string;
  userRole: "PHYSICIAN" | "SALES_REP";
  amount:   number;
  note:     string | null;
  createdAt: string;
  user:     UserInfo;
  orders:   OrderRow[];
};

export type RejectedRow = {
  id:        string;
  userId:    string;
  userRole:  "PHYSICIAN" | "SALES_REP";
  amount:    number;
  note:      string | null;
  adminNote: string | null;
  createdAt: string;
  user:      UserInfo;
};

interface Props {
  pending:  PendingRow[];
  rejected: RejectedRow[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parsePeriod(note: string | null, createdAt: string): string {
  if (note) {
    const m = note.match(/Auto withdrawal\s*[–-]\s*(.+)/i);
    if (m) return m[1].trim();
  }
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function RoleBadge({ role }: { role: "PHYSICIAN" | "SALES_REP" }) {
  return role === "PHYSICIAN"
    ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">Doctor</span>
    : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-[#3DBFA4] border border-teal-200">Medical Rep</span>;
}

// ── Show Orders Modal ─────────────────────────────────────────────────────────
function OrdersModal({ row, onClose }: { row: PendingRow; onClose: () => void }) {
  const period = parsePeriod(row.note, row.createdAt);
  const total  = row.orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Commission Orders</p>
            <h3 className="text-base font-bold text-gray-800 mt-0.5">
              {row.user.firstName} {row.user.lastName} — {period}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1">
          {row.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-gray-400">No commission orders found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 sticky top-0">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {row.orders.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">#{o.orderNumber}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold">{o.rate}%</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600 text-sm">{fmt(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* footer total */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{row.orders.length} order{row.orders.length !== 1 ? "s" : ""}</span>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Commission</p>
            <p className="text-base font-black text-emerald-600">{fmt(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Approve / Reject Modal ────────────────────────────────────────────────────
function ActionModal({
  row,
  action,
  onClose,
  onDone,
}: {
  row:     PendingRow;
  action:  "APPROVED" | "REJECTED";
  onClose: () => void;
  onDone:  (id: string) => void;
}) {
  const [note, setNote]       = useState("");
  const [busy, startTransition] = useTransition();
  const period = parsePeriod(row.note, row.createdAt);

  const handle = () => {
    startTransition(async () => {
      const res = await updateWithdrawRequest(row.id, action, note);
      if (res?.success) {
        toast.success(action === "APPROVED"
          ? `Approved ${fmt(row.amount)} — email + PDF sent to ${row.user.email}`
          : "Request rejected.");
        onDone(row.id);
        onClose();
      } else {
        toast.error(res?.message ?? "Something went wrong.");
      }
    });
  };

  const isApprove = action === "APPROVED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">
          {isApprove ? "Approve Payout" : "Reject Request"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {isApprove
            ? `Approve ${fmt(row.amount)} commission payout for ${row.user.firstName} ${row.user.lastName} (${period})?`
            : `Reject the ${fmt(row.amount)} commission request for ${row.user.firstName} ${row.user.lastName}?`}
        </p>
        {isApprove && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-4 text-xs text-emerald-700 font-medium">
            Commission balance will be deducted and a PDF statement will be emailed to {row.user.email}
          </div>
        )}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Admin Note <span className="normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={isApprove ? "e.g. Paid via ACH on Aug 5" : "e.g. Insufficient balance"}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handle}
            disabled={busy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
              isApprove ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {busy
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : isApprove ? "Approve & Send" : "Reject"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CommissionPayoutClient({ pending: initialPending, rejected }: Props) {
  const [pending,     setPending]     = useState(initialPending);
  const [ordersFor,   setOrdersFor]   = useState<PendingRow | null>(null);
  const [actionModal, setActionModal] = useState<{ row: PendingRow; action: "APPROVED" | "REJECTED" } | null>(null);
  const [deleting,    startDelete]    = useTransition();
  const [confirmDel,  setConfirmDel]  = useState<PendingRow | null>(null);

  const removeRow = (id: string) => setPending((prev) => prev.filter((r) => r.id !== id));

  const handleDelete = (row: PendingRow) => {
    startDelete(async () => {
      const res = await deleteWithdrawRequest(row.id);
      if (res?.success) { toast.success("Request removed."); removeRow(row.id); }
      else              { toast.error(res?.message ?? "Failed."); }
      setConfirmDel(null);
    });
  };

  return (
    <>
      {/* ── Pending section ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-bold text-gray-800">Pending Commissions</h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              {pending.length} pending
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">All caught up — no pending payouts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((row) => {
              const period = parsePeriod(row.note, row.createdAt);
              return (
                <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: user info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-900/8 flex items-center justify-center shrink-0 border border-gray-200">
                        <span className="text-xs font-bold text-[#3DBFA4]">
                          {row.user.firstName[0]}{row.user.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-800">{row.user.firstName} {row.user.lastName}</p>
                          <RoleBadge role={row.userRole} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{row.user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Period: <span className="font-medium text-gray-600">{period}</span>
                          {row.user.bankName && (
                            <> &nbsp;·&nbsp; Bank: <span className="font-medium text-gray-600">{row.user.bankAccountName ?? row.user.bankName}</span></>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="flex items-center gap-3 flex-wrap shrink-0">
                      {/* Commission balance */}
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Commission Balance</p>
                        <p className="text-xl font-black text-gray-800">{fmt(row.amount)}</p>
                        <p className="text-xs text-gray-400">{row.orders.length} order{row.orders.length !== 1 ? "s" : ""}</p>
                      </div>

                      {/* Show Orders */}
                      <button
                        type="button"
                        onClick={() => setOrdersFor(row)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Show Orders
                      </button>

                      {/* Approve */}
                      <button
                        type="button"
                        onClick={() => setActionModal({ row, action: "APPROVED" })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>

                      {/* Reject */}
                      <button
                        type="button"
                        onClick={() => setActionModal({ row, action: "REJECTED" })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setConfirmDel(row)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                        title="Delete request"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Bank info row */}
                  {!row.user.bankName && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      No bank account linked — cannot process payout
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rejected section ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-bold text-gray-800">Rejected Commissions</h2>
          {rejected.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
              {rejected.length}
            </span>
          )}
        </div>

        {rejected.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center py-10">
            <p className="text-sm text-gray-400">No rejected requests</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rejected On</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rejected.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-xs truncate">{r.user.firstName} {r.user.lastName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{r.user.email}</p>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={r.userRole} /></td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{parsePeriod(r.note, r.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700">{fmt(r.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic truncate" title={r.adminNote ?? ""}>
                      {r.adminNote ?? <span className="text-gray-300 not-italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {ordersFor && <OrdersModal row={ordersFor} onClose={() => setOrdersFor(null)} />}

      {actionModal && (
        <ActionModal
          row={actionModal.row}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onDone={removeRow}
        />
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">Delete Request</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove the pending request for {confirmDel.user.firstName} {confirmDel.user.lastName}?
              The commission balance is not affected.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDel)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors"
              >
                {deleting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
