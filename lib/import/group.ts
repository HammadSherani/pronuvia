// Shared grouping helper for Product (one row = one variant) and Order (one
// row = one line item). Rows sharing a key combine into one record. Group-
// level fields use first-non-blank-wins: fill once, leave blank on
// continuation rows; a later row supplying a *different* non-blank value for
// the same field is recorded as a conflict for the caller to report.

export type GroupedRows<T extends Record<string, unknown>> = {
  key: string;
  rowNumbers: number[];
  groupFields: Record<string, unknown>;
  members: { row: number; mapped: T }[];
  conflicts: { field: string; rows: number[] }[];
};

export function groupRows<T extends Record<string, unknown>>(
  rows: { row: number; mapped: T }[],
  opts: {
    /** Returns the grouping key, or null if this row should never be merged with another. */
    keyOf: (mapped: T) => string | null;
    /** Field keys considered group-level (first-non-blank-wins + conflict detection). */
    groupFieldKeys: string[];
  },
): GroupedRows<T>[] {
  const groups = new Map<string, GroupedRows<T>>();
  const order: string[] = [];
  let anon = 0;

  for (const r of rows) {
    const rawKey = opts.keyOf(r.mapped);
    const key = rawKey ?? `__row_${r.row}_${anon++}`;

    let g = groups.get(key);
    if (!g) {
      g = { key, rowNumbers: [], groupFields: {}, members: [], conflicts: [] };
      groups.set(key, g);
      order.push(key);
    }
    g.rowNumbers.push(r.row);
    g.members.push(r);

    for (const field of opts.groupFieldKeys) {
      const val = r.mapped[field];
      const isBlank = val === undefined || val === null || val === "";
      if (isBlank) continue;

      if (!(field in g.groupFields)) {
        g.groupFields[field] = val;
      } else if (g.groupFields[field] !== val) {
        const existing = g.conflicts.find((c) => c.field === field);
        if (existing) existing.rows.push(r.row);
        else g.conflicts.push({ field, rows: [g.rowNumbers[0], r.row] });
      }
    }
  }

  return order.map((k) => groups.get(k)!);
}
