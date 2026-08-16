"use client";

import Link from "next/link";

export function BankNotifyGate({ accountHref }: { accountHref: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">

        {/* Icon */}
        <div className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">Bank Account Required</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Your commission is ready but we need your bank account details to process your payout.
          Please add your bank information to continue using the portal.
        </p>

        <Link
          href={accountHref}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#3DBFA4] hover:bg-[#2ea88f] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Go to Update Profile
        </Link>

        <p className="text-[11px] text-gray-400 mt-4">
          This prompt will disappear once your bank details are saved.
        </p>
      </div>
    </div>
  );
}
