"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/server";
import { requirePhysician } from "@/lib/auth/dal";
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

export type ConfirmPhysicianCardOrderPayload = {
  paymentIntentId: string;
  itemsJson:       string;
  billingAddress:  string;
  shippingAddress: string;
  notes:           string;
  shippingRate:    number;
  total:           number;
};

export type ConfirmPhysicianCardOrderResult = {
  success:      boolean;
  orderNumber?: string;
  message?:     string;
};

function generateOrderNumber(): string {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${ymd}-${rnd}`;
}

export async function confirmPhysicianCardOrder(
  payload: ConfirmPhysicianCardOrderPayload,
): Promise<ConfirmPhysicianCardOrderResult> {
  const session = await requirePhysician();

  if (!stripe) return { success: false, message: "Stripe is not configured on this server." };

  let pi: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>;
  try {
    pi = await stripe.paymentIntents.retrieve(payload.paymentIntentId);
  } catch {
    return { success: false, message: "Could not verify payment. Please contact support." };
  }

  if (pi.status !== "succeeded") {
    return { success: false, message: `Payment not confirmed (status: ${pi.status}).` };
  }
  if (pi.metadata.physicianId !== session.userId) {
    return { success: false, message: "Payment mismatch." };
  }

  const existing = await prisma.order.findFirst({
    where: { stripePaymentIntentId: payload.paymentIntentId },
  });
  if (existing) return { success: true, orderNumber: existing.orderNumber };

  let items: CartItem[];
  try {
    items = JSON.parse(payload.itemsJson) as CartItem[];
  } catch {
    return { success: false, message: "Invalid cart data." };
  }

  const subtotal = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));

  const physician = await prisma.partneringPhysician.findUnique({
    where:  { id: session.userId },
    select: { commission: true, salesRepId: true },
  });
  const physicianCommissionRate   = physician?.commission ?? 0;
  const physicianCommissionAmount = parseFloat(((subtotal * physicianCommissionRate) / 100).toFixed(2));

  let salesRepCommissionRate   = 0;
  let salesRepCommissionAmount = 0;
  if (physician?.salesRepId) {
    const rep = await prisma.salesRepresentative.findUnique({
      where:  { id: physician.salesRepId },
      select: { commission: true },
    });
    salesRepCommissionRate   = rep?.commission ?? 0;
    salesRepCommissionAmount = parseFloat(((subtotal * salesRepCommissionRate) / 100).toFixed(2));
  }

  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  await prisma.$transaction([
    prisma.order.create({
      data: {
        orderNumber,
        physicianId: session.userId,
        salesRepId:  physician?.salesRepId ?? null,
        items:       items as object[],
        subtotal,
        total:       payload.total,
        physicianCommissionRate,
        physicianCommissionAmount,
        salesRepCommissionRate,
        salesRepCommissionAmount,
        billingAddress:        payload.billingAddress  || undefined,
        shippingAddress:       payload.shippingAddress || undefined,
        shippingRate:          payload.shippingRate,
        estimatedDelivery:     estimatedDeliveryDate(7),
        paymentMethod:         "CARD",
        paymentStatus:         "PAID",
        transactionId:         pi.id,
        stripePaymentIntentId: pi.id,
        notes:                 payload.notes || undefined,
      },
    }),
    prisma.partneringPhysician.update({
      where: { id: session.userId },
      data:  { ordersCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/physician/orders");
  return { success: true, orderNumber };
}
