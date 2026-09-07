"use client";

import { useMemo, useState } from "react";
import { ClientPagination } from "@/components/shared/pagination";
import type { RowResult } from "@/lib/import/types";

type Tab = "errors" | "valid" | "all";

export function BulkImportPreviewTable({ results }: { results: RowResult[] }) {
  const hasErrors = results.some((r) => r.status === "error");
  const [tab, setTab] = useState<Tab>(hasErrors ? "errors" : "all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (tab === "errors") return results.filter((r) => r.status === "error");
    if (tab === "valid") return results.filter((r) => r.status === "ok");
    return results;
  }, [results, tab]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const previewKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of pageRows) if (r.preview) Object.keys(r.preview).forEach((k) => keys.add(k));
    return [...keys].slice(0, 5);
  }, [pageRows]);

  function switchTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  const badge: Record<RowResult["status"], string> = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-700 border-red-200",
    skipped: "bg-gray-50 text-gray-500 border-gray-200",
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-3 bg-gray-50/60 border-b border-gray-100">
        {(["errors", "valid", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors capitalize ${
              tab === t ? "bg-white text-gray-900 border border-b-0 border-gray-200" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t} ({t === "errors" ? results.filter((r) => r.status === "error").length : t === "valid" ? results.filter((r) => r.status === "ok").length : results.length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="px-4 py-2 whitespace-nowrap">Row</th>
              <th className="px-4 py-2 whitespace-nowrap">Status</th>
              {previewKeys.map((k) => <th key={k} className="px-4 py-2 whitespace-nowrap">{k}</th>)}
              <th className="px-4 py-2">Issues</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.row} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-500">{r.row}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${badge[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                {previewKeys.map((k) => (
                  <td key={k} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                    {r.preview?.[k] !== undefined ? String(r.preview[k]) : ""}
                  </td>
                ))}
                <td className="px-4 py-2 text-gray-500">
                  {r.errors?.length ? (
                    <ul className="list-disc list-inside space-y-0.5">
                      {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  ) : ""}
                </td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={3 + previewKeys.length} className="px-4 py-8 text-center text-gray-400 text-sm">No rows.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientPagination total={filtered.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
