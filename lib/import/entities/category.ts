import "server-only";
import { prisma } from "@/lib/db/prisma";
import { toSlug } from "@/lib/utils/slug";
import { duplicateKeyField } from "@/lib/db/prisma-errors";
import { str, bool } from "@/lib/import/coerce";
import { ImportCategorySchema } from "@/lib/import/schemas";
import type { ImportIndexes } from "@/lib/import/resolvers";
import type { RowResult } from "@/lib/import/types";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: { indexes: ImportIndexes; commit: boolean },
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenSlugs = new Map<string, number>();

  for (const { row, mapped } of rows) {
    const parsed = ImportCategorySchema.safeParse({
      name: str(mapped.name),
      description: str(mapped.description),
      isActive: bool(mapped.isActive, true),
    });
    if (!parsed.success) {
      results.push({ row, status: "error", errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }

    const { name, description, isActive } = parsed.data;
    const slug = toSlug(name);
    const preview = { name, description: description ?? "", isActive };

    if (ctx.indexes.categoryBySlug.has(slug)) {
      results.push({ row, status: "error", errors: [`A category named "${name}" already exists.`], preview });
      continue;
    }
    if (seenSlugs.has(slug)) {
      results.push({ row, status: "error", errors: [`Duplicate of row ${seenSlugs.get(slug)} in this file.`], preview });
      continue;
    }
    seenSlugs.set(slug, row);

    if (!ctx.commit) {
      results.push({ row, status: "ok", preview });
      continue;
    }

    try {
      await prisma.category.create({ data: { name, slug, description, isActive } });
      ctx.indexes.categoryBySlug.set(slug, { id: slug, name });
      results.push({ row, status: "ok", preview });
    } catch (err) {
      const field = duplicateKeyField(err);
      results.push({ row, status: "error", errors: [field ? `Duplicate ${field}.` : "Failed to create category."], preview });
    }
  }

  return results;
}
