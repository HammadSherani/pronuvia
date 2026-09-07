// Cell coercion helpers for bulk-import rows. Excel cells arrive from
// `XLSX.utils.sheet_to_json(sheet, {defval:""})` as string | number | boolean
// | Date, with blank cells normalized to "" — every helper here treats "" as
// "not provided" (undefined), not as an empty string, since a spreadsheet
// has no other way to represent "leave this optional field blank".

export function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const cleaned = String(v).trim().replace(/[$,]/g, "");
  if (cleaned === "") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function int(v: unknown): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n);
}

const TRUTHY = new Set(["yes", "y", "true", "1", "active"]);
const FALSY  = new Set(["no", "n", "false", "0", "inactive"]);

export function bool(v: unknown, fallback = true): boolean {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (TRUTHY.has(s)) return true;
  if (FALSY.has(s)) return false;
  return fallback;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function date(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number") {
    const d = new Date(EXCEL_EPOCH + v * 86400000);
    return isNaN(d.getTime()) ? undefined : d;
  }
  const s = String(v).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function list(v: unknown, sep = ","): string[] {
  const s = str(v);
  if (!s) return [];
  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

export function enumOf<T extends string>(
  v: unknown,
  values: readonly T[],
  fallback?: T,
): T | undefined {
  const s = str(v);
  if (!s) return fallback;
  const match = values.find((val) => val.toLowerCase() === s.toLowerCase());
  return match ?? fallback;
}
