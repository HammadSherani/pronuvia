"use client";

import { useState } from "react";
import { WithdrawModal } from "./withdraw-modal";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function WalletPanel({
  balance,
  totalPaid,
  totalPending,
  totalWithdrawn,
  commissionOrderCount,
  hasPending,
  bankName,
  bankAccountNumber,
  bankAccountName,
}: {
  balance:              number;
  totalPaid:            number;
  totalPending:         number;
  totalWithdrawn:       number;
  commissionOrderCount: number;
  hasPending:           boolean;
  bankName?:            string | null;
  bankAccountNumber?:   string | null;
  bankAccountName?:     string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-4 gap-5 mb-8">

        {/* ── Wallet balance ── hero card */}
        <div className="col-span-1 relative overflow-hidden bg-gradient-to-br from-[#3DBFA4] to-[#2a9f89] rounded-2xl p-6 text-white shadow-md">
          {/* decorative ring */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border-[16px] border-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full border-[12px] border-white/8 pointer-events-none" />

          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-3xl font-black tabular-nums leading-none mt-1">{fmt(balance)}</p>
          {hasPending && (
            <p className="text-[10px] text-amber-200 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />
              Pending request
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 active:bg-white/40 text-white px-3.5 py-2 rounded-xl transition-colors w-full justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Withdraw Balance
          </button>
        </div>

        {/* ── Total Earned ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Commissions</p>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-800 tabular-nums">{fmt(totalPaid)}</p>
            <p className="text-xs text-gray-400 mt-1">Credited to wallet</p>
            {totalPending > 0 && (
              <p className="text-xs text-amber-500 mt-1 font-medium">
                + {fmt(totalPending)} pending
              </p>
            )}
          </div>
        </div>

        {/* ── Total Withdrawn ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Withdrawn</p>
            <div className="w-8 h-8 rounded-full bg-gray-900/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5BB8D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-800 tabular-nums">{fmt(totalWithdrawn)}</p>
            <p className="text-xs text-gray-400 mt-1">Approved withdrawals</p>
          </div>
        </div>

        {/* ── Commission Orders ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Commission Orders</p>
            <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-800 tabular-nums">{commissionOrderCount}</p>
            <p className="text-xs text-gray-400 mt-1">Orders earning commission</p>
          </div>
        </div>
      </div>

      {open && (
        <WithdrawModal
          balance={balance}
          hasPending={hasPending}
          bankName={bankName}
          bankAccountNumber={bankAccountNumber}
          bankAccountName={bankAccountName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
