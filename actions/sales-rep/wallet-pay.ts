"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
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

export type WalletPayState = {
  success:     boolean;
  orderNumber?: string;
  message?:    string;
} | undefined;

function generateOrderNumber(): string {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${ymd}-${rnd}`;
}

export async function payWithWallet(
  _state: WalletPayState,
  formData: FormData,
): Promise<WalletPayState> {
  const session = await requireSalesRep();

  const itemsRaw       = (formData.get("items")           as string) || "[]";
  const shippingAddress = (formData.get("shippingAddress") as string) || undefined;
  const shippingRate    = parseFloat((formData.get("shippingRate") as string) || "0");
  const total           = parseFloat((formData.get("total")        as string) || "0");
  const notes           = (formData.get("notes")           as string) || undefined;

  let items: CartItem[];
  try {
    items = JSON.parse(itemsRaw) as CartItem[];
  } catch {
    return { success: false, message: "Invalid cart data." };
  }
  if (!items.length) return { success: false, message: "Your cart is empty." };

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

  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  await prisma.$transaction([
    prisma.order.create({
      data: {
        orderNumber,
        salesRepId: session.userId,
        items:      items as object[],
        subtotal,
        total,
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
        salesRepId:  session.userId,
        amount:      total,
        type:        "DEBIT",
        description: `Order ${orderNumber}`,
        balance:     newBalance,
      },
    }),
  ]);

  revalidatePath("/sales/orders");
  return { success: true, orderNumber };
}
