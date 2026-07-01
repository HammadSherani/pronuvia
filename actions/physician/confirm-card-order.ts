"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stripe } from "@/lib/stripe/server";
import { requirePhysician } from "@/lib/auth/dal";
import { estimatedDeliveryDate } from "@/lib/utils/shipping";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { sendMail } from "@/lib/email/mailer";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { validateCartItemsAvailability } from "@/lib/orders/validate-items";

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
  customerEmail:   string;
  couponId?:       string;
  couponCode?:     string;
  discountAmount?: number;
};

export type ConfirmPhysicianCardOrderResult = {
  success:      boolean;
  orderNumber?: string;
  message?:     string;
};

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

  const availability = await validateCartItemsAvailability(items);
  if (!availability.valid) return { success: false, message: availability.message };

  const subtotal = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));

  const physician = await prisma.partneringPhysician.findUnique({
    where:  { id: session.userId },
    select: { commission: true, uplineCommission: true, salesRepId: true, email: true, firstName: true },
  });
  const physicianCommissionRate   = physician?.commission ?? 0;
  const physicianCommissionAmount = parseFloat(((subtotal * physicianCommissionRate) / 100).toFixed(2));

  // Use uplineCommission (set by admin per doctor) for the sales rep's cut on this doctor's orders
  let salesRepCommissionRate   = 0;
  let salesRepCommissionAmount = 0;
  if (physician?.salesRepId) {
    salesRepCommissionRate   = physician.uplineCommission ?? 0;
    salesRepCommissionAmount = parseFloat(((subtotal * salesRepCommissionRate) / 100).toFixed(2));
  }

  const orderNumber = await generateOrderNumber();

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.order.create({
      data: {
        orderNumber,
        physicianId: session.userId,
        salesRepId:  physician?.salesRepId ?? null,
        items:       items as object[],
        subtotal,
        total:          payload.total,
        discountAmount: payload.discountAmount ?? 0,
        couponCode:     payload.couponCode     || undefined,
        couponId:       payload.couponId       || undefined,
        physicianCommissionRate,
        physicianCommissionAmount,
        salesRepCommissionRate,
        salesRepCommissionAmount,
        customerEmail:         payload.customerEmail   || undefined,
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

  // Send order confirmation email: To = customer email, CC = physician's registered email
  if (payload.customerEmail) {
    try {
      const { subject, html } = orderConfirmationEmail({
        orderNumber,
        firstName:  physician?.firstName ?? "Doctor",
        total:      payload.total,
        status:     "PAID",
        items:      items.map((i) => ({
          title:       i.title,
          variantSize: i.variantSize,
          quantity:    i.quantity,
          unitPrice:   i.unitPrice,
          lineTotal:   i.lineTotal,
        })),
      });
      const cc = physician?.email && physician.email !== payload.customerEmail
        ? physician.email
        : undefined;
      await sendMail({ to: payload.customerEmail, cc, subject, html });
    } catch (err) {
      console.error("[physician order] confirmation email failed:", err);
    }
  }

  revalidatePath("/physician/orders");
  return { success: true, orderNumber };
}
