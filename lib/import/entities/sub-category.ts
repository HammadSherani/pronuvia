import "server-only";
import { prisma } from "@/lib/db/prisma";
import { toSlug } from "@/lib/utils/slug";
import { duplicateKeyField } from "@/lib/db/prisma-errors";
import { str, bool } from "@/lib/import/coerce";
import { ImportSubCategorySchema } from "@/lib/import/schemas";
import { resolveCategory } from "@/lib/import/resolvers";
import type { ImportIndexes } from "@/lib/import/resolvers";
import type { RowResult } from "@/lib/import/types";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: { indexes: ImportIndexes; commit: boolean },
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenSlugs = new Map<string, number>();

  for (const { row, mapped } of rows) {
    const parsed = ImportSubCategorySchema.safeParse({
      name: str(mapped.name),
      categoryName: str(mapped.categoryName),
      description: str(mapped.description),
      isActive: bool(mapped.isActive, true),
    });
    if (!parsed.success) {
      results.push({ row, status: "error", errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }

    const { name, categoryName, description, isActive } = parsed.data;
    const preview = { name, categoryName, description: description ?? "", isActive };

    const category = resolveCategory(ctx.indexes, categoryName);
    if (!category) {
      results.push({ row, status: "error", errors: [`Category "${categoryName}" not found. Import Categories first.`], preview });
      continue;
    }

    const slug = toSlug(name);
    if (ctx.indexes.subCategoryBySlug.has(slug)) {
      results.push({ row, status: "error", errors: [`A sub-category named "${name}" already exists.`], preview });
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
      await prisma.subCategory.create({
        data: { name, slug, categoryId: category.id, description, isActive },
      });
      ctx.indexes.subCategoryBySlug.set(slug, { id: slug, categoryId: category.id });
      results.push({ row, status: "ok", preview });
    } catch (err) {
      const field = duplicateKeyField(err);
      results.push({ row, status: "error", errors: [field ? `Duplicate ${field}.` : "Failed to create sub-category."], preview });
    }
  }

  return results;
}
