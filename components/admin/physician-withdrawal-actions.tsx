"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updatePhysicianWithdrawRequest } from "@/actions/admin/manage-physician-withdrawals";

export function PhysicianWithdrawalActions({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [adminNote, setAdminNote]    = useState("");
  const [open,      setOpen]         = useState(false);
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const handle = (action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await updatePhysicianWithdrawRequest(requestId, action, adminNote);
      if (res?.success) {
        toast.success(res.message ?? "Done");
        setOpen(false);
        setAdminNote("");
      } else {
        toast.error(res?.message ?? "Failed");
      }
    });
  };

  const confirm = (action: "APPROVED" | "REJECTED") => {
    setPendingAction(action);
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => confirm("APPROVED")} disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Approve
        </button>
        <button type="button" onClick={() => confirm("REJECTED")} disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>

      {open && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
              {pendingAction === "APPROVED" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {pendingAction === "APPROVED"
                ? "The amount will be deducted from the physician's wallet."
                : "The request will be marked as rejected."}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Note for physician <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason or message…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/40 dark:focus:ring-gray-500/40 focus:border-gray-900 dark:focus:border-gray-500 resize-none transition-colors bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setOpen(false); setAdminNote(""); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => handle(pendingAction)} disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${
                  pendingAction === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                }`}>
                {isPending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : pendingAction === "APPROVED" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
