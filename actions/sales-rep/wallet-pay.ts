"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSalesRep } from "@/lib/auth/dal";
import { estimatedDeliveryDate } from "@/lib/utils/shipping";
import { generateOrderNumber } from "@/lib/orders/order-number";
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

export type WalletPayState = {
  success:     boolean;
  orderNumber?: string;
  message?:    string;
} | undefined;

export async function payWithWallet(
  _state: WalletPayState,
  formData: FormData,
): Promise<WalletPayState> {
  const session = await requireSalesRep();

  const itemsRaw        = (formData.get("items")           as string) || "[]";
  const shippingAddress = (formData.get("shippingAddress") as string) || undefined;
  const shippingRate    = parseFloat((formData.get("shippingRate")    as string) || "0");
  const total           = parseFloat((formData.get("total")           as string) || "0");
  const notes           = (formData.get("notes")           as string) || undefined;
  const couponCode      = (formData.get("couponCode")      as string) || undefined;
  const couponId        = (formData.get("couponId")        as string) || undefined;
  const discountAmount  = parseFloat((formData.get("discountAmount")  as string) || "0");

  let items: CartItem[];
  try {
    items = JSON.parse(itemsRaw) as CartItem[];
  } catch {
    return { success: false, message: "Invalid cart data." };
  }
  if (!items.length) return { success: false, message: "Your cart is empty." };

  const availability = await validateCartItemsAvailability(items);
  if (!availability.valid) return { success: false, message: availability.message };

  const rep = await prisma.salesRepresentative.findUnique({
    where:  { id: session.userId },
    select: { commission: true, walletBalance: true },
  });
  if (!rep) return { success: false, message: "Account not found." };

  if (rep.walletBalance < total) {
    return {
      success: false,
      message: `Insufficient wallet balance. Available: $${rep.walletBalance.toFixed(2)}, Required: $${total.toFixed(2)}`,
    };
  }

  const subtotal         = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
  const commissionRate   = rep.commission;
  const commissionAmount = parseFloat(((subtotal * commissionRate) / 100).toFixed(2));
  const newBalance       = parseFloat((rep.walletBalance - total).toFixed(2));
  const txId             = `WALLET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const deliveryDate     = estimatedDeliveryDate(7);

  const orderNumber = await generateOrderNumber();

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.order.create({
      data: {
        orderNumber,
        salesRepId: session.userId,
        items:      items as object[],
        subtotal,
        total,
        discountAmount: discountAmount || 0,
        couponCode:     couponCode || undefined,
        couponId:       couponId   || undefined,
        salesRepCommissionRate:    commissionRate,
        salesRepCommissionAmount:  commissionAmount,
        physicianCommissionRate:   0,
        physicianCommissionAmount: 0,
        shippingAddress,
        shippingRate,
        estimatedDelivery: deliveryDate,
        paymentMethod:  "WALLET",
        paymentStatus:  "PAID",
        transactionId:  txId,
        notes,
      },
    }),
    prisma.salesRepresentative.update({
      where: { id: session.userId },
      data:  {
        ordersCount:   { increment: 1 },
        walletBalance: newBalance,
      },
    }),
    prisma.walletTransaction.create({
      data: {
        userId:      session.userId,
        userRole:    "SALES_REP",
        amount:      total,
        type:        "DEBIT",
        description: `Order ${orderNumber}`,
        balance:     newBalance,
      },
    }),
  ];

  if (couponId) {
    ops.push(
      prisma.coupon.update({
        where: { id: couponId },
        data:  { usedCount: { increment: 1 } },
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(ops as any);

  revalidatePath("/sales/orders");
  return { success: true, orderNumber };
}
