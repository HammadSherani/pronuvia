"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { approvePhysician, rejectPhysician } from "@/actions/admin/manage-approvals";

type Props = {
  id: string;
  name: string;
  salesRepNote: string | null;
  salesRep?: { firstName: string; lastName: string } | null;
};

export function ApprovalDetailActions({ id, name, salesRepNote, salesRep }: Props) {
  const router = useRouter();
  const [showApprove,  setShowApprove]  = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [commission,   setCommission]   = useState("");
  const [uplineComm,   setUplineComm]   = useState("");
  const [isPending,    startTransition] = useTransition();

  function handleApprove() {
    const docPct    = parseFloat(commission);
    const uplinePct = parseFloat(uplineComm || "0");
    if (isNaN(docPct) || docPct < 0 || docPct > 100) {
      toast.error("Enter a valid doctor commission between 0 and 100");
      return;
    }
    if (isNaN(uplinePct) || uplinePct < 0 || uplinePct > 100) {
      toast.error("Enter a valid sales rep commission between 0 and 100");
      return;
    }
    startTransition(async () => {
      const res = await approvePhysician(id, docPct, uplinePct);
      if (res?.success) {
        toast.success("Physician approved successfully");
        router.push("/admin/approvals");
      } else {
        toast.error(res?.message ?? "Failed to approve");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectPhysician(id);
      if (res?.success) {
        toast.success("Physician rejected");
        router.push("/admin/approvals");
      } else {
        toast.error(res?.message ?? "Failed to reject");
      }
    });
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setCommission(""); setUplineComm(""); setShowApprove(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Approve
        </button>
        <button
          onClick={() => setShowReject(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>

      {/* Approve modal */}
      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Approve {name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Set commission percentages before approving</p>
              </div>
            </div>

            {salesRepNote && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">Sales Rep Note</p>
                <p className="text-xs text-amber-800 italic">{salesRepNote}</p>
              </div>
            )}

            <div className="space-y-4 mb-5">
              {/* Doctor commission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Doctor&apos;s Commission %
                  <span className="ml-1.5 text-xs font-normal text-gray-400">earned on their own orders</span>
                </label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#3DBFA4] focus:border-[#3DBFA4] transition bg-white"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                </div>
              </div>

              {/* Sales rep upline commission — only if doctor was added by a sales rep */}
              {salesRep && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sales Rep&apos;s Commission %
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      earned by {salesRep.firstName} {salesRep.lastName} on this doctor&apos;s orders
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" step="0.01" min="0" max="100"
                      value={uplineComm}
                      onChange={(e) => setUplineComm(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#3DBFA4] focus:border-[#3DBFA4] transition bg-white"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPending ? "Approving…" : "Approve & Set Commission"}
              </button>
              <button
                onClick={() => setShowApprove(false)}
                disabled={isPending}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Reject this physician?</p>
                <p className="text-xs text-gray-500 mt-0.5">{name} will be marked as rejected.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isPending}
                className="flex-1 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPending ? "Rejecting…" : "Yes, Reject"}
              </button>
              <button
                onClick={() => setShowReject(false)}
                disabled={isPending}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
