"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stripe } from "@/lib/stripe/server";
import { requireSalesRep } from "@/lib/auth/dal";
import { estimatedDeliveryDate } from "@/lib/utils/shipping";

type CartItem = {
  productId:   string;
  title:       string;
  variantSize: string;
  sku:         string;
  unitPrice:   number;
  quantity:    number;
  lineTotal:   number;
};

export type ConfirmCardOrderPayload = {
  paymentIntentId: string;
  itemsJson:       string;
  shippingAddress: string;
  notes:           string;
  shippingRate:    number;
  total:           number;
  couponId?:       string;
  couponCode?:     string;
  discountAmount?: number;
};

export type ConfirmCardOrderResult = {
  success:     boolean;
  orderNumber?: string;
  message?:    string;
};

function generateOrderNumber(): string {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${ymd}-${rnd}`;
}

export async function confirmCardOrder(
  payload: ConfirmCardOrderPayload,
): Promise<ConfirmCardOrderResult> {
  const session = await requireSalesRep();

  if (!stripe) return { success: false, message: "Stripe is not configured on this server." };

  // Verify PaymentIntent with Stripe
  let pi: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>;
  try {
    pi = await stripe.paymentIntents.retrieve(payload.paymentIntentId);
  } catch {
    return { success: false, message: "Could not verify payment. Please contact support." };
  }

  if (pi.status !== "succeeded") {
    return { success: false, message: `Payment not confirmed (status: ${pi.status}).` };
  }
  if (pi.metadata.salesRepId !== session.userId) {
    return { success: false, message: "Payment mismatch." };
  }

  // Prevent duplicate order for same payment intent
  const existing = await prisma.order.findFirst({
    where: { stripePaymentIntentId: payload.paymentIntentId },
  });
  if (existing) {
    return { success: true, orderNumber: existing.orderNumber };
  }

  let items: CartItem[];
  try {
    items = JSON.parse(payload.itemsJson) as CartItem[];
  } catch {
    return { success: false, message: "Invalid cart data." };
  }

  const subtotal = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));

  const rep = await prisma.salesRepresentative.findUnique({
    where:  { id: session.userId },
    select: { commission: true },
  });
  const commissionRate   = rep?.commission ?? 0;
  const commissionAmount = parseFloat(((subtotal * commissionRate) / 100).toFixed(2));

  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  const deliveryDate = estimatedDeliveryDate(7);

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.order.create({
      data: {
        orderNumber,
        salesRepId: session.userId,
        items:      items as object[],
        subtotal,
        total:          payload.total,
        discountAmount: payload.discountAmount ?? 0,
        couponCode:     payload.couponCode     || undefined,
        couponId:       payload.couponId       || undefined,
        salesRepCommissionRate:    commissionRate,
        salesRepCommissionAmount:  commissionAmount,
        physicianCommissionRate:   0,
        physicianCommissionAmount: 0,
        shippingAddress:  payload.shippingAddress || undefined,
        shippingRate:     payload.shippingRate,
        estimatedDelivery: deliveryDate,
        paymentMethod:    "CARD",
        paymentStatus:    "PAID",
        transactionId:    pi.id,
        stripePaymentIntentId: pi.id,
        notes: payload.notes || undefined,
      },
    }),
    prisma.salesRepresentative.update({
      where: { id: session.userId },
      data:  { ordersCount: { increment: 1 } },
    }),
  ];

  if (payload.couponId) {
    ops.push(
      prisma.coupon.update({
        where: { id: payload.couponId },
        data:  { usedCount: { increment: 1 } },
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(ops as any);

  revalidatePath("/sales/orders");
  return { success: true, orderNumber };
}
