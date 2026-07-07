"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { z } from "zod";
import { OrderStatus } from "@/generated/prisma/enums";

export type OrderActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export type OrderItem = {
  productId: string;
  title: string;
  variantSize: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

const OrderItemSchema = z.object({
  productId:   z.string().min(1),
  title:       z.string().min(1),
  variantSize: z.string(),
  sku:         z.string(),
  quantity:    z.number().int().min(1),
  unitPrice:   z.number().min(0),
  lineTotal:   z.number().min(0),
});

const CreateOrderSchema = z.object({
  physicianId: z.string().min(1, "Physician is required"),
  items:       z.array(OrderItemSchema).min(1, "At least one product is required"),
  notes:       z.string().optional(),
});

function generateOrderNumber(): string {
  const date = new Date();
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${yyyymmdd}-${rand}`;
}

export async function createOrder(
  _state: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  await requireAdmin();

  const itemsRaw = formData.get("items");
  const raw = {
    physicianId: (formData.get("physicianId") as string) || "",
    items: itemsRaw ? JSON.parse(itemsRaw as string) : [],
    notes: (formData.get("notes") as string) || undefined,
  };

  const validated = CreateOrderSchema.safeParse(raw);
  if (!validated.success) return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };

  const { physicianId, items, notes } = validated.data;

  // Load physician — uplineCommission is the per-doctor rate for the assigned sales rep
  const physician = await prisma.partneringPhysician.findUnique({
    where: { id: physicianId },
    select: {
      id: true, commission: true, uplineCommission: true,
      salesRepId: true,
      salesRep: { select: { id: true } },
    },
  });
  if (!physician) return { message: "Physician not found." };

  // Compute order totals
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total    = subtotal;

  // Snapshot rates at order creation — changing them later won't affect this order
  // salesRepCommissionRate comes from physician.uplineCommission (per-doctor rate, not global rep rate)
  const physicianCommissionRate = physician.commission;
  const salesRepCommissionRate  = physician.uplineCommission ?? 0;

  const physicianCommissionAmount   = parseFloat(((total * physicianCommissionRate)   / 100).toFixed(2));
  const salesRepCommissionAmount    = parseFloat(((total * salesRepCommissionRate)    / 100).toFixed(2));

  // Ensure unique order number
  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  // Transactionally create order + increment counters on both sides
  await Promise.all([
    prisma.order.create({
      data: {
        orderNumber,
        physicianId,
        salesRepId: physician.salesRepId ?? undefined,
        items: items as object[],
        subtotal,
        total,
        physicianCommissionRate,
        physicianCommissionAmount,
        salesRepCommissionRate,
        salesRepCommissionAmount,
        notes,
      },
    }),
    prisma.partneringPhysician.update({
      where: { id: physicianId },
      data: { ordersCount: { increment: 1 } },
    }),
    ...(physician.salesRepId
      ? [prisma.salesRepresentative.update({
          where: { id: physician.salesRepId },
          data: { ordersCount: { increment: 1 } },
        })]
      : []),
  ]);

  revalidatePath("/admin/orders");
  return { success: true, message: `Order ${orderNumber} created successfully.` };
}

export type ShipOrderPayload = {
  carrier:          string;
  trackingNumber:   string;
  shippingCost:     number;
  estimatedDelivery: string; // ISO date string yyyy-mm-dd
};

export async function shipOrder(
  orderId: string,
  payload: ShipOrderPayload,
): Promise<OrderActionState> {
  await requireAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) return { message: "Order not found." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status:           OrderStatus.SHIPPED,
      shippingCarrier:  payload.carrier || null,
      trackingNumber:   payload.trackingNumber.trim() || null,
      shippingRate:     payload.shippingCost,
      estimatedDelivery: payload.estimatedDelivery ? new Date(payload.estimatedDelivery) : null,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/sales/orders");
  revalidatePath("/physician/orders");
  return { success: true, message: "Order marked as shipped." };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<OrderActionState> {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where:  { id },
    select: {
      id: true, status: true, orderNumber: true,
      salesRepId: true,
      physicianId: true,
      salesRepCommissionAmount: true,
      physicianCommissionAmount: true,
      commissionPaid: true,
    },
  });
  if (!order) return { message: "Order not found." };

  const isCompleting = status === OrderStatus.COMPLETED && !order.commissionPaid;

  if (isCompleting) {
    // Credit sales rep commission
    if (order.salesRepId && order.salesRepCommissionAmount > 0) {
      const rep = await prisma.salesRepresentative.findUnique({
        where:  { id: order.salesRepId },
        select: { walletBalance: true },
      });
      const currentBalance = rep?.walletBalance ?? 0;
      const newBalance     = currentBalance + order.salesRepCommissionAmount;

      await prisma.salesRepresentative.update({
        where: { id: order.salesRepId },
        data:  { walletBalance: newBalance },
      });
      await prisma.walletTransaction.create({
        data: {
          userId:      order.salesRepId,
          userRole:    "SALES_REP",
          amount:      order.salesRepCommissionAmount,
          type:        "CREDIT",
          description: `Commission for order #${order.orderNumber}`,
          orderId:     id,
          balance:     newBalance,
        },
      });
    }

    // Credit physician commission
    if (order.physicianId && order.physicianCommissionAmount > 0) {
      const physician = await prisma.partneringPhysician.findUnique({
        where:  { id: order.physicianId },
        select: { walletBalance: true },
      });
      const currentBalance = physician?.walletBalance ?? 0;
      const newBalance     = currentBalance + order.physicianCommissionAmount;

      await prisma.partneringPhysician.update({
        where: { id: order.physicianId },
        data:  { walletBalance: newBalance },
      });
      await prisma.walletTransaction.create({
        data: {
          userId:      order.physicianId,
          userRole:    "PHYSICIAN",
          amount:      order.physicianCommissionAmount,
          type:        "CREDIT",
          description: `Commission for order #${order.orderNumber}`,
          orderId:     id,
          balance:     newBalance,
        },
      });
    }
  }

  await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(isCompleting && { commissionPaid: true }),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/sales/wallet");
  revalidatePath("/physician/wallet");
  return { success: true, message: "Order status updated." };
}

export async function deleteOrder(id: string): Promise<OrderActionState> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { message: "Order not found." };

  // Decrement counters
  await Promise.all([
    prisma.order.delete({ where: { id } }),
    ...(order.physicianId
      ? [prisma.partneringPhysician.update({
          where: { id: order.physicianId },
          data: { ordersCount: { decrement: 1 } },
        })]
      : []),
    ...(order.salesRepId
      ? [prisma.salesRepresentative.update({
          where: { id: order.salesRepId },
          data: { ordersCount: { decrement: 1 } },
        })]
      : []),
  ]);

  revalidatePath("/admin/orders");
  return { success: true, message: "Order deleted." };
}

export async function listOrders(opts?: { skip?: number; take?: number }) {
  await requireAdmin();
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true, orderNumber: true, status: true, total: true,
        subtotal: true, placedByAdmin: true,
        salesRepCommissionRate: true, salesRepCommissionAmount: true,
        physicianCommissionRate: true, physicianCommissionAmount: true,
        paymentMethod: true, paymentStatus: true, transactionId: true,
        shippingCarrier: true, trackingNumber: true, shippingRate: true, estimatedDelivery: true,
        returnedAt: true, returnedTotal: true,
        salesRepClawback: true, physicianClawback: true,
        physician: { select: { firstName: true, lastName: true, nameOfPractice: true } },
        salesRep:  { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: opts?.skip,
      take: opts?.take,
    }),
    prisma.order.count(),
  ]);
  return { orders, total };
}

export async function getOrderById(id: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { id },
    include: {
      physician: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          nameOfPractice: true, commission: true,
          phone: true, addressOne: true, addressTwo: true, city: true, state: true, zipCode: true,
          walletBalance: true,
        },
      },
      salesRep: {
        select: {
          id: true, name: true, firstName: true, lastName: true, email: true,
          phone: true, commission: true, billingAddress: true,
          walletBalance: true,
        },
      },
    },
  });
}

export type OrderEmailType =
  | "new_order"
  | "cancelled_order"
  | "processing_order"
  | "completed_order"
  | "order_details";

export async function sendOrderEmail(
  orderId: string,
  emailType: OrderEmailType
): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true, total: true, status: true, items: true,
      trackingNumber: true, shippingCarrier: true, estimatedDelivery: true,
      customerEmail: true,
      physician: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!order)               return { success: false, message: "Order not found." };
  if (!order.physician)     return { success: false, message: "No physician linked to this order." };

  const label: Record<OrderEmailType, string> = {
    new_order:        "New Order",
    cancelled_order:  "Cancelled Order",
    processing_order: "Processing Order",
    completed_order:  "Completed Order",
    order_details:    "Order Details",
  };

  type RawItem = { title?: string; variantSize?: string; quantity?: number; unitPrice?: number; lineTotal?: number };
  const items = (order.items as RawItem[]).map((i) => ({
    title:       i.title       ?? "Product",
    variantSize: i.variantSize,
    quantity:    i.quantity    ?? 1,
    unitPrice:   i.unitPrice   ?? 0,
    lineTotal:   i.lineTotal   ?? 0,
  }));

  const emailData = {
    orderNumber:       order.orderNumber,
    firstName:         order.physician.firstName,
    total:             order.total,
    status:            order.status,
    items,
    trackingNumber:    order.trackingNumber,
    shippingCarrier:   order.shippingCarrier,
    estimatedDelivery: order.estimatedDelivery,
  };

  const {
    orderConfirmationEmail, orderProcessingEmail, orderCompletedEmail,
    orderCancelledEmail, orderDetailsEmail,
  } = await import("@/lib/email/templates");
  const { sendMail } = await import("@/lib/email/mailer");

  const templateFns: Record<OrderEmailType, (d: typeof emailData) => { subject: string; html: string }> = {
    new_order:        orderConfirmationEmail,
    processing_order: orderProcessingEmail,
    completed_order:  orderCompletedEmail,
    cancelled_order:  orderCancelledEmail,
    order_details:    orderDetailsEmail,
  };

  const { subject, html } = templateFns[emailType](emailData);

  // If a customer email was entered at checkout, use it as To and CC the doctor; otherwise fall back to the doctor's email
  const toEmail = order.customerEmail ?? order.physician.email;
  const ccEmail = order.customerEmail && order.customerEmail !== order.physician.email
    ? order.physician.email
    : undefined;

  try {
    await sendMail({ to: toEmail, cc: ccEmail, subject, html });
    return { success: true, message: `"${label[emailType]}" email sent to ${toEmail}.` };
  } catch (err) {
    console.error("[sendOrderEmail]", err);
    return { success: false, message: "Failed to send email. Check SMTP settings." };
  }
}

export async function getOrderByNumber(orderNumber: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    select: {
      id: true, orderNumber: true, status: true,
      total: true, subtotal: true, items: true,
      salesRepId: true, physicianId: true,
      salesRepCommissionAmount: true, salesRepCommissionRate: true,
      physicianCommissionAmount: true, physicianCommissionRate: true,
      commissionPaid: true,
      returnedAt: true,
      salesRep: { select: { id: true, name: true, walletBalance: true } },
      physician: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export type ReturnActionState = {
  success?: boolean;
  message?: string;
} | undefined;

export type RefundLineItem   = { index: number; returnedQty: number };
export type StoredRefundItem = { index: number; returnedQty: number; lineTotal: number };
export type CustomerRefundPayload = {
  method: "manual" | "stripe";
  amount: number;
};

export async function processReturn(
  orderId:        string,
  returnedLines:  RefundLineItem[] | null,  // null = full refund of all remaining
  reason:         string,
  customerRefund?: CustomerRefundPayload,
): Promise<ReturnActionState> {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      id: true, orderNumber: true, status: true, total: true, subtotal: true, items: true,
      salesRepId: true, physicianId: true,
      salesRepCommissionAmount: true, physicianCommissionAmount: true,
      commissionPaid: true,
      returnedAt: true, returnedTotal: true, returnReason: true,
      salesRepClawback: true, physicianClawback: true,
      stripePaymentIntentId: true,
      salesRep:  { select: { walletBalance: true } },
      physician: { select: { walletBalance: true } },
    },
  });

  if (!order) return { message: "Order not found." };

  const items = order.items as unknown as OrderItem[];

  // ── Load existing refunds to compute already-refunded quantities ─────────
  const existingRefunds = await prisma.orderRefund.findMany({
    where:   { orderId },
    orderBy: { processedAt: "asc" },
  });

  const refundedQtyByIdx = new Map<number, number>();
  for (const r of existingRefunds) {
    if (!r.items) {
      items.forEach((item, idx) => refundedQtyByIdx.set(idx, item.quantity));
    } else {
      for (const ri of r.items as StoredRefundItem[]) {
        refundedQtyByIdx.set(ri.index, (refundedQtyByIdx.get(ri.index) ?? 0) + ri.returnedQty);
      }
    }
  }

  const remainingByIdx = new Map<number, number>();
  for (let i = 0; i < items.length; i++) {
    remainingByIdx.set(i, Math.max(0, items[i].quantity - (refundedQtyByIdx.get(i) ?? 0)));
  }

  const totalRemaining = Array.from(remainingByIdx.values()).reduce((s, v) => s + v, 0);
  if (totalRemaining === 0) return { message: "All items on this order have already been refunded." };

  // ── Determine lines to process ───────────────────────────────────────────
  let linesToProcess: { index: number; returnedQty: number }[];
  let isFullThisRefund: boolean;

  if (returnedLines === null) {
    linesToProcess = items
      .map((_, idx) => ({ index: idx, returnedQty: remainingByIdx.get(idx) ?? 0 }))
      .filter(l => l.returnedQty > 0);
    isFullThisRefund = true;
  } else {
    const activeLines = returnedLines.filter(rl => rl.returnedQty > 0);
    if (activeLines.length === 0) return { message: "No items selected for refund." };

    for (const line of activeLines) {
      const remaining = remainingByIdx.get(line.index) ?? 0;
      if (line.returnedQty > remaining) {
        return { message: `Item #${line.index + 1} exceeds remaining refundable quantity (${remaining}).` };
      }
    }

    linesToProcess = activeLines;
    isFullThisRefund = items.every((_, idx) => {
      const remaining = remainingByIdx.get(idx) ?? 0;
      if (remaining === 0) return true;
      const line = linesToProcess.find(l => l.index === idx);
      return !!line && line.returnedQty >= remaining;
    });
  }

  // ── Build stored items and compute event total ───────────────────────────
  const storedRefundItems: StoredRefundItem[] = linesToProcess.map(rl => {
    const item  = items[rl.index];
    const r     = item ? rl.returnedQty / item.quantity : 0;
    return {
      index:       rl.index,
      returnedQty: rl.returnedQty,
      lineTotal:   parseFloat(((item?.lineTotal ?? 0) * r).toFixed(2)),
    };
  });

  const eventTotal = parseFloat(
    storedRefundItems.reduce((s, ri) => s + ri.lineTotal, 0).toFixed(2)
  );
  if (eventTotal <= 0) return { message: "Refund amount is zero." };

  // ── Commission clawback for this event ───────────────────────────────────
  const existingSalesRepClawback  = order.salesRepClawback  ?? 0;
  const existingPhysicianClawback = order.physicianClawback ?? 0;
  const remainingSalesRepCommission  = Math.max(0, order.salesRepCommissionAmount  - existingSalesRepClawback);
  const remainingPhysicianCommission = Math.max(0, order.physicianCommissionAmount - existingPhysicianClawback);

  const denominator = order.subtotal > 0 ? order.subtotal : order.total;
  const salesRepClawback  = isFullThisRefund
    ? remainingSalesRepCommission
    : parseFloat(Math.min(remainingSalesRepCommission, order.salesRepCommissionAmount * Math.min(1.0, eventTotal / denominator)).toFixed(2));
  const physicianClawback = isFullThisRefund
    ? remainingPhysicianCommission
    : parseFloat(Math.min(remainingPhysicianCommission, order.physicianCommissionAmount * Math.min(1.0, eventTotal / denominator)).toFixed(2));

  const refundNumber = existingRefunds.length + 1;

  // ── Customer payment refund (Stripe or manual) ──────────────────────────
  let stripeRefundId: string | null = null;

  if (customerRefund && customerRefund.amount > 0) {
    if (customerRefund.method === "stripe") {
      if (!order.stripePaymentIntentId) {
        return { message: "No Stripe payment on this order — cannot process Stripe refund." };
      }
      const { stripe } = await import("@/lib/stripe/server");
      if (!stripe) {
        return { message: "Stripe is not configured on this server." };
      }
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          amount:         Math.round(customerRefund.amount * 100),
        });
        stripeRefundId = stripeRefund.id;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Stripe refund failed.";
        return { message: `Stripe error: ${msg}` };
      }
    }
    // "manual" — no external call, just record it below
  }

  // ── Create OrderRefund record ────────────────────────────────────────────
  await prisma.orderRefund.create({
    data: {
      orderId,
      refundNumber,
      items:                storedRefundItems as object[],
      total:                eventTotal,
      salesRepClawback,
      physicianClawback,
      reason:               reason.trim() || null,
      customerRefundMethod: customerRefund?.amount && customerRefund.amount > 0 ? customerRefund.method : null,
      customerRefundAmount: customerRefund?.amount && customerRefund.amount > 0 ? customerRefund.amount : null,
      stripeRefundId:       stripeRefundId || null,
    },
  });

  // ── Commission clawback (negative balance allowed) ───────────────────────
  if (order.commissionPaid) {
    if (order.salesRepId && salesRepClawback > 0) {
      const currentBalance = order.salesRep?.walletBalance ?? 0;
      const newBalance     = parseFloat((currentBalance - salesRepClawback).toFixed(2));
      await prisma.salesRepresentative.update({
        where: { id: order.salesRepId },
        data:  { walletBalance: newBalance },
      });
      await prisma.walletTransaction.create({
        data: {
          userId:      order.salesRepId,
          userRole:    "SALES_REP",
          amount:      salesRepClawback,
          type:        "DEBIT",
          description: `Commission clawback — refund #${refundNumber} on order #${order.orderNumber}`,
          orderId,
          balance:     newBalance,
        },
      });
    }

    if (order.physicianId && physicianClawback > 0) {
      const currentBalance = order.physician?.walletBalance ?? 0;
      const newBalance     = parseFloat((currentBalance - physicianClawback).toFixed(2));
      await prisma.partneringPhysician.update({
        where: { id: order.physicianId },
        data:  { walletBalance: newBalance },
      });
      await prisma.walletTransaction.create({
        data: {
          userId:      order.physicianId,
          userRole:    "PHYSICIAN",
          amount:      physicianClawback,
          type:        "DEBIT",
          description: `Commission clawback — refund #${refundNumber} on order #${order.orderNumber}`,
          orderId,
          balance:     newBalance,
        },
      });
    }
  }

  // ── Inventory restore ────────────────────────────────────────────────────
  await Promise.all(linesToProcess.map(async rl => {
    const item = items[rl.index];
    if (!item?.productId || !rl.returnedQty) return;
    try {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return;
      type Variant = { sku?: string; stock?: number; [key: string]: unknown };
      const variants = (product.variants ?? []) as Variant[];
      const vIdx     = variants.findIndex(v => v.sku && item.sku && v.sku === item.sku);
      if (vIdx !== -1) {
        variants[vIdx] = { ...variants[vIdx], stock: (variants[vIdx].stock ?? 0) + rl.returnedQty };
        const newTotal = variants.reduce((s, v) => s + (v.stock ?? 0), 0);
        await prisma.product.update({
          where: { id: item.productId },
          data:  { variants: variants as object[], quantity: newTotal },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data:  { quantity: { increment: rl.returnedQty } },
        });
      }
    } catch (e) {
      console.error(`[Inventory Restore] product ${item.productId}:`, e);
    }
  }));

  // ── Update order aggregate fields ────────────────────────────────────────
  const newReturnedTotal     = parseFloat(((order.returnedTotal ?? 0) + eventTotal).toFixed(2));
  const newSalesRepClawback  = parseFloat((existingSalesRepClawback + salesRepClawback).toFixed(2));
  const newPhysicianClawback = parseFloat((existingPhysicianClawback + physicianClawback).toFixed(2));

  await prisma.order.update({
    where: { id: orderId },
    data:  {
      status:            (isFullThisRefund ? "REFUNDED" : order.status) as OrderStatus,
      returnedAt:        order.returnedAt ?? new Date(),
      returnReason:      reason.trim() || order.returnReason || null,
      returnedTotal:     newReturnedTotal,
      salesRepClawback:  newSalesRepClawback,
      physicianClawback: newPhysicianClawback,
      ...(isFullThisRefund && { commissionPaid: false }),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/sales/wallet");
  revalidatePath("/physician/wallet");

  const customerNote = stripeRefundId
    ? ` Stripe refund $${customerRefund!.amount.toFixed(2)} sent.`
    : customerRefund?.method === "manual" && (customerRefund.amount ?? 0) > 0
    ? ` Manual refund $${customerRefund.amount.toFixed(2)} recorded.`
    : "";

  return {
    success: true,
    message: order.commissionPaid
      ? `Refund #${refundNumber} processed.${customerNote} Rep clawback: $${salesRepClawback.toFixed(2)}, Doctor clawback: $${physicianClawback.toFixed(2)}.`
      : `Refund #${refundNumber} processed.${customerNote} Commission not yet paid — no clawback applied.`,
  };
}

export async function getOrderRefunds(orderId: string) {
  await requireAdmin();
  return prisma.orderRefund.findMany({
    where:   { orderId },
    orderBy: { processedAt: "asc" },
  });
}

export async function getCommissionSummary(opts?: { salesRepId?: string; physicianId?: string }) {
  await requireAdmin();
  const where = opts?.salesRepId
    ? { salesRepId: opts.salesRepId }
    : opts?.physicianId
    ? { physicianId: opts.physicianId }
    : {};

  const orders = await prisma.order.findMany({
    where,
    select: {
      salesRepCommissionRate: true, salesRepCommissionAmount: true,
      physicianCommissionRate: true, physicianCommissionAmount: true,
      total: true, status: true, createdAt: true, orderNumber: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSalesRepCommission   = orders.reduce((s, o) => s + o.salesRepCommissionAmount,  0);
  const totalPhysicianCommission  = orders.reduce((s, o) => s + o.physicianCommissionAmount, 0);
  const totalRevenue              = orders.reduce((s, o) => s + o.total, 0);

  return { orders, totalSalesRepCommission, totalPhysicianCommission, totalRevenue };
}

