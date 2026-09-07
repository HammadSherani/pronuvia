import "server-only";
import { prisma } from "@/lib/db/prisma";
import { str, num, int, date } from "@/lib/import/coerce";
import { ImportOrderGroupSchema, ImportOrderItemRowSchema } from "@/lib/import/schemas";
import { groupRows } from "@/lib/import/group";
import { buildAddressJson } from "@/lib/import/address";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { OrderStatus } from "@/generated/prisma/enums";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

const GROUP_FIELDS = [
  "orderNumber", "createdAt", "physicianEmail", "salesRepEmail", "status",
  "subtotal", "shippingRate", "discountAmount", "couponCode", "total",
  "physicianCommissionRate", "physicianCommissionAmount", "salesRepCommissionRate", "salesRepCommissionAmount",
  "paymentMethod", "paymentStatus", "transactionId", "shippingCarrier", "trackingNumber",
  "customerEmail", "customerPhone", "notes",
  "shipFirstName", "shipLastName", "shipPhone", "shipAddress1", "shipAddress2", "shipCity", "shipState", "shipZip", "shipCountry",
  "billFirstName", "billLastName", "billPhone", "billAddress1", "billAddress2", "billCity", "billState", "billZip", "billCountry",
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];

  // Order Number is expected on every row of a shared order (not blank-
  // continuation like Product's Title) — blank rows are intentionally never
  // grouped, each becoming its own single-item order.
  const groups = groupRows(rows, {
    keyOf: (m) => str(m.orderNumber) ?? null,
    groupFieldKeys: GROUP_FIELDS,
  });

  const seenOrderNumbers = new Map<string, number>();
  const physicianOrderIncrements = new Map<string, number>();
  const repOrderIncrements = new Map<string, number>();

  for (const g of groups) {
    if (g.conflicts.length) {
      const msgs = g.conflicts.map((c) => `Rows ${c.rows.join(", ")} disagree on "${c.field}" — leave it blank after the first row.`);
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: msgs });
      continue;
    }

    const gf = g.groupFields;
    const groupParsed = ImportOrderGroupSchema.safeParse({
      orderNumber: str(gf.orderNumber),
      createdAt: date(gf.createdAt),
      physicianEmail: str(gf.physicianEmail)?.toLowerCase(),
      salesRepEmail: str(gf.salesRepEmail)?.toLowerCase(),
      status: str(gf.status)?.toUpperCase(),
      subtotal: num(gf.subtotal),
      shippingRate: num(gf.shippingRate) ?? 0,
      discountAmount: num(gf.discountAmount) ?? 0,
      couponCode: str(gf.couponCode),
      total: num(gf.total),
      physicianCommissionRate: num(gf.physicianCommissionRate) ?? 0,
      physicianCommissionAmount: num(gf.physicianCommissionAmount),
      salesRepCommissionRate: num(gf.salesRepCommissionRate) ?? 0,
      salesRepCommissionAmount: num(gf.salesRepCommissionAmount),
      paymentMethod: str(gf.paymentMethod),
      paymentStatus: str(gf.paymentStatus),
      transactionId: str(gf.transactionId),
      shippingCarrier: str(gf.shippingCarrier),
      trackingNumber: str(gf.trackingNumber),
      customerEmail: str(gf.customerEmail)?.toLowerCase(),
      customerPhone: str(gf.customerPhone),
      notes: str(gf.notes),
      shipFirstName: str(gf.shipFirstName), shipLastName: str(gf.shipLastName), shipPhone: str(gf.shipPhone),
      shipAddress1: str(gf.shipAddress1), shipAddress2: str(gf.shipAddress2), shipCity: str(gf.shipCity),
      shipState: str(gf.shipState), shipZip: str(gf.shipZip), shipCountry: str(gf.shipCountry),
      billFirstName: str(gf.billFirstName), billLastName: str(gf.billLastName), billPhone: str(gf.billPhone),
      billAddress1: str(gf.billAddress1), billAddress2: str(gf.billAddress2), billCity: str(gf.billCity),
      billState: str(gf.billState), billZip: str(gf.billZip), billCountry: str(gf.billCountry),
    });
    if (!groupParsed.success) {
      const msgs = groupParsed.error.issues.map((i) => i.message);
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: msgs });
      continue;
    }
    const order = groupParsed.data;
    const groupErrors: string[] = [];
    const groupWarnings: string[] = [];

    const physician = ctx.indexes.physicianIdByEmail.get(order.physicianEmail);
    if (!physician) groupErrors.push(`Physician "${order.physicianEmail}" not found. Import Physicians first.`);

    let salesRepId: string | null = null;
    if (order.salesRepEmail) {
      salesRepId = ctx.indexes.repIdByEmail.get(order.salesRepEmail) ?? null;
      if (!salesRepId) groupErrors.push(`Medical Rep "${order.salesRepEmail}" not found.`);
    } else {
      salesRepId = physician?.salesRepId ?? null;
    }

    if (order.orderNumber) {
      if (ctx.indexes.orderNumbers.has(order.orderNumber)) groupErrors.push(`Order Number "${order.orderNumber}" already exists.`);
      else if (seenOrderNumbers.has(order.orderNumber)) groupErrors.push(`Duplicate of row ${seenOrderNumbers.get(order.orderNumber)} in this file.`);
    }

    // ── Items ──────────────────────────────────────────────────────────────
    const items: { productId: string; title: string; variantSize: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];
    const rowErrors = new Map<number, string[]>();

    for (const m of g.members) {
      const iParsed = ImportOrderItemRowSchema.safeParse({
        itemSku: str(m.mapped.itemSku),
        itemTitle: str(m.mapped.itemTitle),
        itemVariantSize: str(m.mapped.itemVariantSize),
        itemQuantity: int(m.mapped.itemQuantity),
        itemUnitPrice: num(m.mapped.itemUnitPrice),
        itemLineTotal: num(m.mapped.itemLineTotal),
      });
      if (!iParsed.success) {
        rowErrors.set(m.row, iParsed.error.issues.map((i) => i.message));
        continue;
      }
      const it = iParsed.data;
      const product = it.itemSku ? ctx.indexes.productIdBySku.get(it.itemSku) : undefined;
      if (it.itemSku && !product) groupWarnings.push(`Row ${m.row}: SKU "${it.itemSku}" not found in current catalog — item kept, productId left blank.`);

      items.push({
        productId: product?.id ?? "",
        title: it.itemTitle,
        variantSize: it.itemVariantSize ?? "",
        sku: it.itemSku ?? "",
        quantity: it.itemQuantity,
        unitPrice: it.itemUnitPrice,
        lineTotal: it.itemLineTotal ?? round2(it.itemQuantity * it.itemUnitPrice),
      });
    }

    if (groupErrors.length || rowErrors.size) {
      const reported = new Set<number>();
      for (const rowNum of g.rowNumbers) {
        const errs = [...groupErrors, ...(rowErrors.get(rowNum) ?? [])];
        if (errs.length) { results.push({ row: rowNum, status: "error", errors: errs }); reported.add(rowNum); }
      }
      for (const rowNum of g.rowNumbers) {
        if (!reported.has(rowNum)) results.push({ row: rowNum, status: "skipped", errors: ["Skipped — another row for this order failed."] });
      }
      continue;
    }

    if (!items.length) {
      for (const rowNum of g.rowNumbers) results.push({ row: rowNum, status: "error", errors: ["No valid line items for this order."] });
      continue;
    }

    // Template-provided money values always win over recomputation — historical
    // numbers are authoritative. Blanks fall back to computed values.
    const subtotal = order.subtotal ?? round2(items.reduce((s, i) => s + i.lineTotal, 0));
    const total = order.total ?? round2(subtotal + order.shippingRate - order.discountAmount);
    const physicianCommissionAmount = order.physicianCommissionAmount ?? round2((total * order.physicianCommissionRate) / 100);
    const salesRepCommissionAmount = order.salesRepCommissionAmount ?? round2((total * order.salesRepCommissionRate) / 100);

    const shipAddr = buildAddressJson({
      firstName: order.shipFirstName, lastName: order.shipLastName, phone: order.shipPhone,
      address1: order.shipAddress1, address2: order.shipAddress2, city: order.shipCity,
      state: order.shipState, zip: order.shipZip, country: order.shipCountry,
    });
    const hasBillTo = order.billFirstName || order.billLastName || order.billAddress1 || order.billCity;
    const billAddr = hasBillTo
      ? buildAddressJson({
          firstName: order.billFirstName, lastName: order.billLastName, phone: order.billPhone,
          address1: order.billAddress1, address2: order.billAddress2, city: order.billCity,
          state: order.billState, zip: order.billZip, country: order.billCountry,
        })
      : shipAddr;

    const preview = {
      orderNumber: order.orderNumber || "(auto)", physicianEmail: order.physicianEmail,
      items: items.length, total, status: order.status,
    };

    if (!ctx.commit) {
      const rowResults = g.rowNumbers.map((rowNum) => ({ row: rowNum, status: "ok" as const, preview, groupKey: order.orderNumber || undefined, errors: groupWarnings.length ? groupWarnings : undefined }));
      results.push(...rowResults);
      continue;
    }

    const orderNumber = order.orderNumber || await generateOrderNumber();

    await prisma.order.create({
      data: {
        orderNumber,
        physicianId: physician!.id,
        salesRepId,
        items,
        subtotal,
        total,
        physicianCommissionRate: order.physicianCommissionRate,
        physicianCommissionAmount,
        salesRepCommissionRate: order.salesRepCommissionRate,
        salesRepCommissionAmount,
        status: order.status as OrderStatus,
        commissionPaid: true,
        billingAddress: billAddr,
        shippingAddress: shipAddr,
        shippingRate: order.shippingRate,
        shippingCarrier: order.shippingCarrier ?? null,
        trackingNumber: order.trackingNumber ?? null,
        paymentMethod: order.paymentMethod ?? null,
        paymentStatus: order.paymentStatus ?? null,
        transactionId: order.transactionId ?? null,
        notes: order.notes ?? null,
        couponCode: order.couponCode ?? null,
        discountAmount: order.discountAmount,
        customerEmail: order.customerEmail ?? null,
        customerPhone: order.customerPhone ?? null,
        placedByAdmin: false,
        importedAt: new Date(),
        createdAt: order.createdAt,
      },
    });

    ctx.indexes.orderNumbers.add(orderNumber);
    physicianOrderIncrements.set(physician!.id, (physicianOrderIncrements.get(physician!.id) ?? 0) + 1);
    if (salesRepId) repOrderIncrements.set(salesRepId, (repOrderIncrements.get(salesRepId) ?? 0) + 1);

    const rowResults = g.rowNumbers.map((rowNum) => ({ row: rowNum, status: "ok" as const, preview, groupKey: orderNumber, errors: groupWarnings.length ? groupWarnings : undefined }));
    results.push(...rowResults);
  }

  if (ctx.commit) {
    await Promise.all([
      ...[...physicianOrderIncrements.entries()].map(([id, n]) =>
        prisma.partneringPhysician.update({ where: { id }, data: { ordersCount: { increment: n } } })),
      ...[...repOrderIncrements.entries()].map(([id, n]) =>
        prisma.salesRepresentative.update({ where: { id }, data: { ordersCount: { increment: n } } })),
    ]);
  }

  return results;
}
