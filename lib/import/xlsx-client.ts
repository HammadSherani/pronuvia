import * as XLSX from "xlsx";
import { COLUMNS, ENTITY_LABELS, mapRowToFields, missingRequiredHeaders } from "./registry";
import type { ImportEntity, RawRow, RowResult } from "./types";

/** Downloads a blank .xlsx template for `entity`: a Data sheet with just the
 * header row, and an Instructions sheet documenting every column. */
export function downloadTemplate(entity: ImportEntity) {
  const columns = COLUMNS[entity];
  const meta = ENTITY_LABELS[entity];

  const dataSheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header)]);
  dataSheet["!cols"] = columns.map((c) => ({ wch: Math.max(14, c.header.length + 2) }));

  const instructionsRows = [
    ["Column", "Required", "Format", "Example", "Notes"],
    ...columns.map((c) => [c.header, c.required ? "Yes" : "No", c.format, c.example, c.note ?? ""]),
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsRows);
  instructionsSheet["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 40 }, { wch: 24 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dataSheet, meta.sheetName);
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");
  XLSX.writeFile(wb, `${meta.fileName}.xlsx`);
}

export type ParsedWorkbook = {
  rows: { row: number; mapped: Record<string, unknown> }[];
  unknownHeaders: string[];
  missingRequiredHeaders: string[];
};

/** Reads an uploaded File into rows mapped onto the entity's canonical
 * column keys. `row` is the 1-based spreadsheet row (header row = 1). */
export async function parseWorkbook(file: File, entity: ImportEntity): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const meta = ENTITY_LABELS[entity];
  const sheet = wb.Sheets[meta.sheetName] ?? wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  const headers = raw.length ? Object.keys(raw[0]) : [];
  const missing = missingRequiredHeaders(entity, headers);

  const allUnknown = new Set<string>();
  const rows: { row: number; mapped: Record<string, unknown> }[] = [];

  raw.forEach((r, i) => {
    const { mapped, unknownHeaders } = mapRowToFields(entity, r);
    unknownHeaders.forEach((h) => allUnknown.add(h));
    // Drop rows that are entirely blank (Excel loves to add trailing blank rows).
    const hasAny = Object.values(mapped).some((v) => v !== undefined && v !== null && v !== "");
    if (!hasAny) return;
    rows.push({ row: i + 2, mapped }); // header is row 1, data starts at row 2
  });

  return { rows, unknownHeaders: [...allUnknown], missingRequiredHeaders: missing };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Downloads the failed rows from a preview/summary as a re-editable .xlsx
 * with an added Errors column, so the admin can fix and re-upload. */
export function downloadErrorReport(entity: ImportEntity, results: RowResult[]) {
  const meta = ENTITY_LABELS[entity];
  const failed = results.filter((r) => r.status === "error");
  const rows = failed.map((r) => ({
    Row: r.row,
    ...(r.preview ?? {}),
    Errors: (r.errors ?? []).join("; "),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, `${meta.fileName}-errors.xlsx`);
}
