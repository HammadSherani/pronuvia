"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { buildImportIndexes, type ImportIndexes } from "@/lib/import/resolvers";
import { ENTITY_LABELS } from "@/lib/import/registry";
import type { ImportEntity, ImportOptions, ImportPreview, ImportSummary, RowResult } from "@/lib/import/types";

import * as categoryHandler from "@/lib/import/entities/category";
import * as subCategoryHandler from "@/lib/import/entities/sub-category";
import * as productHandler from "@/lib/import/entities/product";
import * as couponHandler from "@/lib/import/entities/coupon";
import * as shippingRateHandler from "@/lib/import/entities/shipping-rate";
import * as salesRepHandler from "@/lib/import/entities/sales-rep";
import * as physicianHandler from "@/lib/import/entities/physician";
import * as orderHandler from "@/lib/import/entities/order";

export type EntityHandlerCtx = {
  indexes: ImportIndexes;
  commit: boolean;
  sendEmails?: boolean;
  adminId?: string;
};

type Handler = {
  handle(
    rows: { row: number; mapped: Record<string, unknown> }[],
    ctx: EntityHandlerCtx,
  ): Promise<RowResult[]>;
};

const HANDLERS: Record<ImportEntity, Handler> = {
  category: categoryHandler,
  subCategory: subCategoryHandler,
  product: productHandler,
  coupon: couponHandler,
  shippingRate: shippingRateHandler,
  salesRep: salesRepHandler,
  physician: physicianHandler,
  order: orderHandler,
};

const MAX_ROWS_PER_CALL = 500;

/**
 * Two-phase per entity: commit=false validates every row (schema + relation
 * resolution + duplicate checks) and writes nothing; commit=true re-runs the
 * same validation and creates only the valid rows. Rows already carry their
 * true spreadsheet row number (assigned once, client-side, over the whole
 * parsed file) so chunking here never needs to renumber them.
 */
export async function importRows(
  entity: ImportEntity,
  rows: { row: number; mapped: Record<string, unknown> }[],
  opts: ImportOptions,
): Promise<ImportPreview | ImportSummary> {
  const session = await requireAdmin();

  if (!HANDLERS[entity]) throw new Error("Unknown import entity.");
  if (rows.length > MAX_ROWS_PER_CALL) throw new Error(`Too many rows in one call (max ${MAX_ROWS_PER_CALL}).`);

  const indexes = await buildImportIndexes(entity);
  const results = await HANDLERS[entity].handle(rows, {
    indexes,
    commit: opts.commit,
    sendEmails: opts.sendEmails,
    adminId: session.userId,
  });

  if (!opts.commit) {
    return {
      entity,
      totalRows: rows.length,
      okCount: results.filter((r) => r.status === "ok").length,
      errorCount: results.filter((r) => r.status === "error").length,
      results,
    };
  }

  if (opts.isLastChunk) {
    revalidatePath(ENTITY_LABELS[entity].listPath);
  }

  return {
    entity,
    created: results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status !== "ok").length,
    failed: results.filter((r) => r.status === "error").length,
    results,
  };
}

export async function getImportCounts() {
  await requireAdmin();
  const [category, subCategory, product, coupon, shippingRate, physician, salesRep, order] = await Promise.all([
    prisma.category.count(),
    prisma.subCategory.count(),
    prisma.product.count(),
    prisma.coupon.count(),
    prisma.shippingRate.count(),
    prisma.partneringPhysician.count(),
    prisma.salesRepresentative.count(),
    prisma.order.count(),
  ]);
  return { category, subCategory, product, coupon, shippingRate, physician, salesRep, order };
}
