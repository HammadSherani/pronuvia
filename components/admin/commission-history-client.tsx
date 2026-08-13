"use client";

import { useState } from "react";

type OrderRow = { orderNumber: string; createdAt: string; amount: number; rate: number };

export type HistoryRow = {
  id:        string;
  userRole:  "PHYSICIAN" | "SALES_REP";
  amount:    number;
  note:      string | null;
  adminNote: string | null;
  createdAt: string;
  user:      { firstName: string; lastName: string; email: string };
  orders:    OrderRow[];
};

interface Props {
  rows: HistoryRow[];
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

// ── Statement Modal ───────────────────────────────────────────────────────────
function StatementModal({ row, onClose }: { row: HistoryRow; onClose: () => void }) {
  const period = parsePeriod(row.note, row.createdAt);
  const total  = row.orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-[#3DBFA4] uppercase tracking-widest mb-1">Commission Statement</p>
            <h3 className="text-lg font-bold text-gray-800">
              {row.user.firstName} {row.user.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={row.userRole} />
              <span className="text-xs text-gray-400">{row.user.email}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Period: <strong className="text-gray-700">{period}</strong>
              &nbsp;·&nbsp;
              Approved: <strong className="text-gray-700">
                {new Date(row.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Paid</p>
              <p className="text-xl font-black text-emerald-600">{fmt(row.amount)}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Admin note if any */}
        {row.adminNote && (
          <div className="mx-6 mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
            <span className="font-bold text-gray-500 uppercase tracking-wide text-[10px]">Admin Note: </span>
            {row.adminNote}
          </div>
        )}

        {/* Orders table */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {row.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-gray-400">No commission orders found for this user</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Showing all commission orders on record for this user
              </p>
              <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {row.orders.map((o) => (
                    <tr key={o.orderNumber} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                          #{o.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold">
                          {o.rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">{fmt(o.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <span className="text-xs text-gray-400">
            {row.orders.length} commission order{row.orders.length !== 1 ? "s" : ""} on record
          </span>
          <div className="text-right">
            <p className="text-xs text-gray-400">Amount Paid Out</p>
            <p className="text-base font-black text-emerald-600">{fmt(row.amount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CommissionHistoryClient({ rows }: Props) {
  const [filter,      setFilter]      = useState<"all" | "PHYSICIAN" | "SALES_REP">("all");
  const [statementFor, setStatementFor] = useState<HistoryRow | null>(null);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.userRole === filter);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "PHYSICIAN", "SALES_REP"] as const).map((f) => {
          const label = f === "all" ? "All" : f === "PHYSICIAN" ? "Doctors" : "Medical Reps";
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No approved payouts yet</p>
          <p className="text-xs text-gray-400 mt-1">Approved payouts from Commission Payout will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[27%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Approved</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => {
                const period = parsePeriod(r.note, r.createdAt);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800 text-xs truncate">
                        {r.user.firstName} {r.user.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{r.user.email}</p>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5"><RoleBadge role={r.userRole} /></td>

                    {/* Period */}
                    <td className="px-4 py-3.5 text-xs font-medium text-gray-700">{period}</td>

                    {/* Amount paid */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-black text-emerald-600">{fmt(r.amount)}</span>
                    </td>

                    {/* Date approved */}
                    <td className="px-4 py-3.5 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>

                    {/* Statement link */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setStatementFor(r)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1b3b6f] hover:text-[#3DBFA4] transition-colors group"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Statement
                        <span className="text-[10px] text-gray-400 font-normal">({r.orders.length} orders)</span>
                      </button>
                      {r.adminNote && (
                        <p className="text-[11px] text-gray-400 italic mt-0.5 truncate" title={r.adminNote}>
                          Note: {r.adminNote}
                        </p>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Statement modal */}
      {statementFor && (
        <StatementModal row={statementFor} onClose={() => setStatementFor(null)} />
      )}
    </>
  );
}
