import "server-only";
import { prisma } from "@/lib/db/prisma";
import { duplicateKeyField } from "@/lib/db/prisma-errors";
import { str, num, int, bool, date } from "@/lib/import/coerce";
import { ImportCouponSchema } from "@/lib/import/schemas";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenCodes = new Map<string, number>();

  for (const { row, mapped } of rows) {
    const parsed = ImportCouponSchema.safeParse({
      code: str(mapped.code)?.toUpperCase(),
      description: str(mapped.description),
      discountType: str(mapped.discountType)?.toUpperCase(),
      discountValue: num(mapped.discountValue),
      minOrderAmount: num(mapped.minOrderAmount),
      maxUses: int(mapped.maxUses),
      usedCount: int(mapped.usedCount) ?? 0,
      expiresAt: date(mapped.expiresAt),
      isActive: bool(mapped.isActive, true),
      applicableTo: str(mapped.applicableTo)?.toUpperCase() ?? "ALL",
    });
    if (!parsed.success) {
      results.push({ row, status: "error", errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }

    const data = parsed.data;
    const preview = { code: data.code, discountType: data.discountType, discountValue: data.discountValue, isActive: data.isActive };

    if (ctx.indexes.couponCodes.has(data.code)) {
      results.push({ row, status: "error", errors: [`Coupon code "${data.code}" already exists.`], preview });
      continue;
    }
    if (seenCodes.has(data.code)) {
      results.push({ row, status: "error", errors: [`Duplicate of row ${seenCodes.get(data.code)} in this file.`], preview });
      continue;
    }
    seenCodes.set(data.code, row);

    if (!ctx.commit) {
      results.push({ row, status: "ok", preview });
      continue;
    }

    try {
      await prisma.coupon.create({
        data: {
          code: data.code,
          description: data.description ?? null,
          discountType: data.discountType,
          discountValue: data.discountValue,
          minOrderAmount: data.minOrderAmount ?? null,
          maxUses: data.maxUses ?? null,
          usedCount: data.usedCount,
          expiresAt: data.expiresAt ?? null,
          isActive: data.isActive,
          applicableTo: data.applicableTo,
        },
      });
      ctx.indexes.couponCodes.add(data.code);
      results.push({ row, status: "ok", preview });
    } catch (err) {
      const field = duplicateKeyField(err);
      results.push({ row, status: "error", errors: [field ? `Duplicate ${field}.` : "Failed to create coupon."], preview });
    }
  }

  return results;
}
