import "server-only";
import { prisma } from "@/lib/db/prisma";
import { toSlug } from "@/lib/utils/slug";
import { str, num, int, list } from "@/lib/import/coerce";
import { ImportProductGroupSchema, ImportProductVariantSchema } from "@/lib/import/schemas";
import { resolveCategory, resolveSubCategory } from "@/lib/import/resolvers";
import { groupRows } from "@/lib/import/group";
import { deriveProductFields } from "@/lib/products/derive";
import { ProductStatus } from "@/generated/prisma/enums";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

const GROUP_FIELDS = ["title", "categoryName", "subCategoryName", "description", "tags", "status", "image", "imageGallery"];

/** Title uses first-non-blank-wins across a product's variant rows — a blank
 * Title inherits the last non-blank Title seen above it in the sheet. */
function carryForwardTitle(rows: { row: number; mapped: Record<string, unknown> }[]) {
  let lastTitle: unknown;
  return rows.map((r) => {
    const raw = r.mapped.title;
    const isBlank = raw === undefined || raw === null || raw === "";
    if (!isBlank) { lastTitle = raw; return r; }
    if (lastTitle !== undefined) return { row: r.row, mapped: { ...r.mapped, title: lastTitle } };
    return r;
  });
}

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const carried = carryForwardTitle(rows);

  const groups = groupRows(carried, {
    keyOf: (m) => { const t = str(m.title); return t ? toSlug(t) : null; },
    groupFieldKeys: GROUP_FIELDS,
  });

  const seenSlugs = new Map<string, number>();
  const seenSkus = new Map<string, number>();

  for (const g of groups) {
    const titleRaw = str(g.groupFields.title);
    if (!titleRaw) {
      for (const m of g.members) results.push({ row: m.row, status: "error", errors: ["Title is required (fill it on the first row of this product)."] });
      continue;
    }

    if (g.conflicts.length) {
      const msgs = g.conflicts.map((c) => `Rows ${c.rows.join(", ")} disagree on "${c.field}" — leave it blank after the first row.`);
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: msgs });
      continue;
    }

    const groupParsed = ImportProductGroupSchema.safeParse({
      title: titleRaw,
      categoryName: str(g.groupFields.categoryName),
      subCategoryName: str(g.groupFields.subCategoryName),
      description: str(g.groupFields.description),
      tags: list(g.groupFields.tags),
      status: str(g.groupFields.status)?.toUpperCase(),
      image: str(g.groupFields.image),
      imageGallery: list(g.groupFields.imageGallery),
    });
    if (!groupParsed.success) {
      const msgs = groupParsed.error.issues.map((i) => i.message);
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: msgs });
      continue;
    }
    const group = groupParsed.data;
    const groupErrors: string[] = [];

    const category = resolveCategory(ctx.indexes, group.categoryName);
    let subCategoryId: string | null = null;
    if (!category) {
      groupErrors.push(`Category "${group.categoryName}" not found. Import Categories first.`);
    } else if (group.subCategoryName) {
      const sub = resolveSubCategory(ctx.indexes, group.subCategoryName, category.id);
      if (!sub.found) groupErrors.push(`Sub Category "${group.subCategoryName}" not found.`);
      else if (sub.wrongCategory) groupErrors.push(`Sub Category "${group.subCategoryName}" does not belong to Category "${group.categoryName}".`);
      else subCategoryId = sub.sub.id;
    }

    const slug = toSlug(group.title);
    if (ctx.indexes.productSlugs.has(slug)) groupErrors.push(`A product titled "${group.title}" already exists.`);
    else if (seenSlugs.has(slug)) groupErrors.push(`Duplicate of row ${seenSlugs.get(slug)} in this file (same title).`);

    const variants: { size: string; sku?: string; gtin?: string; image?: string; costPrice?: number; salePrice?: number; stock?: number; weight?: number; status: string }[] = [];
    const rowErrors = new Map<number, string[]>();

    for (const m of g.members) {
      const vParsed = ImportProductVariantSchema.safeParse({
        variantSize: str(m.mapped.variantSize),
        variantSku: str(m.mapped.variantSku),
        variantGtin: str(m.mapped.variantGtin),
        variantImage: str(m.mapped.variantImage),
        variantCost: num(m.mapped.variantCost),
        variantSale: num(m.mapped.variantSale),
        variantStock: int(m.mapped.variantStock),
        variantWeight: num(m.mapped.variantWeight),
        variantStatus: str(m.mapped.variantStatus)?.toLowerCase(),
      });
      if (!vParsed.success) {
        rowErrors.set(m.row, vParsed.error.issues.map((i) => i.message));
        continue;
      }
      const v = vParsed.data;
      if (v.variantSku) {
        if (ctx.indexes.productSkus.has(v.variantSku)) {
          rowErrors.set(m.row, [`SKU "${v.variantSku}" already exists.`]);
          continue;
        }
        if (seenSkus.has(v.variantSku)) {
          rowErrors.set(m.row, [`Duplicate SKU (row ${seenSkus.get(v.variantSku)}).`]);
          continue;
        }
        seenSkus.set(v.variantSku, m.row);
      }
      variants.push({
        size: v.variantSize, sku: v.variantSku, gtin: v.variantGtin, image: v.variantImage,
        costPrice: v.variantCost, salePrice: v.variantSale, stock: v.variantStock, weight: v.variantWeight,
        status: v.variantStatus,
      });
    }

    if (groupErrors.length || rowErrors.size) {
      const reported = new Set<number>();
      for (const rowNum of g.rowNumbers) {
        const errs = [...groupErrors, ...(rowErrors.get(rowNum) ?? [])];
        if (errs.length) {
          results.push({ row: rowNum, status: "error", errors: errs });
          reported.add(rowNum);
        }
      }
      for (const rowNum of g.rowNumbers) {
        if (!reported.has(rowNum)) {
          results.push({ row: rowNum, status: "skipped", errors: ["Skipped — another row for this product failed."] });
        }
      }
      continue;
    }

    if (!variants.length) {
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: ["No valid variants for this product."] });
      continue;
    }

    seenSlugs.set(slug, g.rowNumbers[0]);
    const derived = deriveProductFields(variants);
    const preview = { title: group.title, category: group.categoryName, variants: variants.length, sku: derived.sku, salePrice: derived.salePrice };

    if (!ctx.commit) {
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "ok", preview, groupKey: slug });
      continue;
    }

    await prisma.product.create({
      data: {
        title: group.title,
        description: group.description,
        image: group.image || null,
        imageGallery: group.imageGallery,
        tags: group.tags,
        variants,
        status: group.status as ProductStatus,
        categoryId: category!.id,
        subCategoryId,
        slug,
        ...derived,
      },
    });
    ctx.indexes.productSlugs.add(slug);
    ctx.indexes.productSkus.add(derived.sku);
    for (const v of variants) if (v.sku) ctx.indexes.productSkus.add(v.sku);

    for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "ok", preview, groupKey: slug });
  }

  return results;
}
