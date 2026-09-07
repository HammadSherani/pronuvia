"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { importRows } from "@/actions/admin/bulk-import";
import { downloadTemplate, parseWorkbook, chunk, downloadErrorReport } from "@/lib/import/xlsx-client";
import { ENTITY_LABELS, IMPORT_ORDER } from "@/lib/import/registry";
import type { ImportEntity, RowResult } from "@/lib/import/types";
import { PageHeader } from "@/components/admin/page-header";
import { BulkImportPreviewTable } from "@/components/admin/bulk-import-preview-table";
import { BulkImportConfirmModal } from "@/components/admin/bulk-import-confirm-modal";

type Counts = Record<ImportEntity, number>;

const CHUNK_SIZE: Record<ImportEntity, number> = {
  category: 200, subCategory: 200, product: 200, coupon: 200, shippingRate: 200,
  salesRep: 100, physician: 100, order: 150,
};

export function BulkImportClient({ counts: initialCounts }: { counts: Counts }) {
  const [counts, setCounts] = useState(initialCounts);
  const [entity, setEntity] = useState<ImportEntity>("category");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<{ row: number; mapped: Record<string, unknown> }[] | null>(null);
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([]);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [sendEmails, setSendEmails] = useState(false);
  const [validating, startValidating] = useTransition();
  const [committing, startCommitting] = useTransition();
  const [preview, setPreview] = useState<{ results: RowResult[]; okCount: number; errorCount: number } | null>(null);
  const [summary, setSummary] = useState<{ created: number; skipped: number; failed: number; results: RowResult[] } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function resetFile() {
    setFileName(null);
    setParsedRows(null);
    setUnknownHeaders([]);
    setMissingHeaders([]);
    setPreview(null);
    setSummary(null);
  }

  function selectEntity(e: ImportEntity) {
    setEntity(e);
    resetFile();
  }

  async function handleFile(file: File) {
    resetFile();
    setFileName(file.name);
    try {
      const parsed = await parseWorkbook(file, entity);
      setParsedRows(parsed.rows);
      setUnknownHeaders(parsed.unknownHeaders);
      setMissingHeaders(parsed.missingRequiredHeaders);
      if (!parsed.rows.length) toast.error("No data rows found in that file.");
    } catch {
      toast.error("Could not read that file. Make sure it's a .xlsx, .xls, or .csv export.");
      resetFile();
    }
  }

  function runValidate() {
    if (!parsedRows || missingHeaders.length) return;
    startValidating(async () => {
      const chunks = chunk(parsedRows, CHUNK_SIZE[entity]);
      const allResults: RowResult[] = [];
      setProgress({ done: 0, total: parsedRows.length });
      for (const c of chunks) {
        const res = await importRows(entity, c, { commit: false, rowOffset: 0 });
        allResults.push(...res.results);
        setProgress((p) => (p ? { done: p.done + c.length, total: p.total } : null));
      }
      setProgress(null);
      setPreview({
        results: allResults,
        okCount: allResults.filter((r) => r.status === "ok").length,
        errorCount: allResults.filter((r) => r.status === "error").length,
      });
    });
  }

  function runCommit() {
    if (!parsedRows) return;
    setConfirmOpen(false);
    startCommitting(async () => {
      const chunks = chunk(parsedRows, CHUNK_SIZE[entity]);
      let created = 0, skipped = 0, failed = 0;
      const allResults: RowResult[] = [];
      setProgress({ done: 0, total: parsedRows.length });
      for (let i = 0; i < chunks.length; i++) {
        const res = await importRows(entity, chunks[i], {
          commit: true, rowOffset: 0, sendEmails, isLastChunk: i === chunks.length - 1,
        });
        if ("created" in res) {
          created += res.created;
          skipped += res.skipped;
          failed += res.failed;
          allResults.push(...res.results);
        }
        setProgress((p) => (p ? { done: p.done + chunks[i].length, total: p.total } : null));
      }
      setProgress(null);
      setSummary({ created, skipped, failed, results: allResults });
      setCounts((c) => ({ ...c, [entity]: c[entity] + created }));
      if (created) toast.success(`Imported ${created} of ${parsedRows.length} row${parsedRows.length !== 1 ? "s" : ""}.${skipped ? ` ${skipped} skipped.` : ""}`);
      else toast.error("Nothing was imported — every row had an error.");
    });
  }

  const meta = ENTITY_LABELS[entity];
  const busy = validating || committing;

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Import" description="Download a template, fill it with your data, upload and review before committing." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {IMPORT_ORDER.map((e) => {
          const m = ENTITY_LABELS[e];
          const blockedOn = m.dependsOn.filter((dep) => counts[dep] === 0);
          return (
            <button
              key={e}
              type="button"
              onClick={() => selectEntity(e)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                entity === e ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold text-gray-800">{m.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{counts[e]} in database</div>
              {blockedOn.length > 0 && (
                <div className="text-[11px] text-amber-600 mt-1">
                  Import {blockedOn.map((dep) => ENTITY_LABELS[dep].label).join(", ")} first
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{meta.label}</h2>
        <p className="text-xs text-gray-400">{meta.description}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadTemplate(entity)}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Download Template
          </button>

          <label className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
            Upload Filled Template
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </label>

          {fileName && <span className="text-xs text-gray-500">{fileName} — {parsedRows?.length ?? 0} row(s) found</span>}
        </div>

        {missingHeaders.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            Missing required column{missingHeaders.length !== 1 ? "s" : ""}: {missingHeaders.join(", ")}
          </div>
        )}
        {unknownHeaders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Unrecognized column{unknownHeaders.length !== 1 ? "s" : ""} (ignored): {unknownHeaders.join(", ")}
          </div>
        )}

        {(entity === "physician" || entity === "salesRep") && parsedRows && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} />
            Send welcome / setup emails to imported accounts
          </label>
        )}

        {parsedRows && !missingHeaders.length && !preview && (
          <button
            type="button"
            onClick={runValidate}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-[#3DBFA4] hover:bg-[#2ea88f] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {validating && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {validating ? `Checking… ${progress ? `${progress.done}/${progress.total}` : ""}` : "Validate"}
          </button>
        )}
      </div>

      {preview && !summary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Preview</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-600 font-medium">✔ {preview.okCount} valid</span>
              <span className="text-red-500 font-medium">✘ {preview.errorCount} errors</span>
            </div>
          </div>

          <BulkImportPreviewTable results={preview.results} />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!preview.okCount || committing}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {committing && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {committing ? `Importing… ${progress ? `${progress.done}/${progress.total}` : ""}` : `Import ${preview.okCount} Valid Row${preview.okCount !== 1 ? "s" : ""}`}
            </button>
            {preview.errorCount > 0 && (
              <button
                type="button"
                onClick={() => downloadErrorReport(entity, preview.results)}
                className="text-sm text-gray-500 hover:text-gray-800 underline"
              >
                Download error report
              </button>
            )}
          </div>
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Result</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-600 font-medium">{summary.created} created</span>
            {summary.skipped > 0 && <span className="text-amber-600 font-medium">{summary.skipped} skipped</span>}
          </div>
          {summary.failed > 0 && (
            <>
              <BulkImportPreviewTable results={summary.results} />
              <button
                type="button"
                onClick={() => downloadErrorReport(entity, summary.results)}
                className="text-sm text-gray-500 hover:text-gray-800 underline"
              >
                Download error report
              </button>
            </>
          )}
          <button
            type="button"
            onClick={resetFile}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Import another file
          </button>
        </div>
      )}

      {confirmOpen && preview && (
        <BulkImportConfirmModal
          entity={entity}
          okCount={preview.okCount}
          errorCount={preview.errorCount}
          sendEmails={sendEmails}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={runCommit}
        />
      )}
    </div>
  );
}
