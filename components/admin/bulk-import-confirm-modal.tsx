"use client";

import { ENTITY_LABELS } from "@/lib/import/registry";
import type { ImportEntity } from "@/lib/import/types";

export function BulkImportConfirmModal({
  entity, okCount, errorCount, sendEmails, onCancel, onConfirm,
}: {
  entity: ImportEntity;
  okCount: number;
  errorCount: number;
  sendEmails: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const meta = ENTITY_LABELS[entity];

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 my-auto text-center">
        <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-2">Import {okCount} {meta.label}?</h2>
        <p className="text-sm text-gray-500 mb-1">
          {okCount} valid row{okCount !== 1 ? "s" : ""} will be created.
          {errorCount > 0 && ` ${errorCount} row${errorCount !== 1 ? "s" : ""} with errors will be skipped.`}
        </p>
        {(entity === "physician" || entity === "salesRep") && (
          <p className="text-xs text-gray-400 mb-1">
            {sendEmails ? "Welcome / setup emails will be sent to each imported account." : "No emails will be sent."}
          </p>
        )}
        {entity === "order" && (
          <p className="text-xs text-gray-400 mb-1">
            Imported orders are historical records only — no wallet balances or commission transactions will be created.
          </p>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
