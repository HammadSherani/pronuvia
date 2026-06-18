"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSalesRep } from "@/lib/auth/dal";

export type SalesOrderState = {
  message?: string;
  success?: boolean;
  orderNumber?: string;
} | undefined;

const SingleSchema = z.object({
  productId:   z.string().min(1),
  title:       z.string().min(1),
  variantSize: z.string(),
  sku:         z.string(),
  unitPrice:   z.number().min(0),
  quantity:    z.number().int().min(1),
  notes:       z.string().optional(),
});

function generateOrderNumber(): string {
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${yyyymmdd}-${rand}`;
}

async function getSalesRepCommission(salesRepId: string) {
  const rep = await prisma.salesRepresentative.findUnique({
    where:  { id: salesRepId },
    select: { commission: true },
  });
  return rep?.commission ?? 0;
}

// ── Single product quick-buy (Buy Now) ──────────────────────────────────────

export async function createOrderBySalesRep(
  _state: SalesOrderState,
  formData: FormData,
): Promise<SalesOrderState> {
  const session = await requireSalesRep();

  const raw = {
    productId:   (formData.get("productId")   as string) || "",
    title:       (formData.get("title")        as string) || "",
    variantSize: (formData.get("variantSize")  as string) || "",
    sku:         (formData.get("sku")          as string) || "",
    unitPrice:   parseFloat((formData.get("unitPrice") as string) || "0"),
    quantity:    parseInt((formData.get("quantity")    as string) || "1", 10),
    notes:       (formData.get("notes") as string) || undefined,
  };

  const validated = SingleSchema.safeParse(raw);
  if (!validated.success) return { message: "Please fill in all required fields." };

  const { productId, title, variantSize, sku, unitPrice, quantity, notes } = validated.data;

  const salesRepCommissionRate   = await getSalesRepCommission(session.userId);
  const lineTotal                = parseFloat((unitPrice * quantity).toFixed(2));
  const salesRepCommissionAmount = parseFloat(((lineTotal * salesRepCommissionRate) / 100).toFixed(2));

  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  await prisma.$transaction([
    prisma.order.create({
      data: {
        orderNumber,
        salesRepId: session.userId,
        items: [{ productId, title, variantSize, sku, quantity, unitPrice, lineTotal }] as object[],
        subtotal: lineTotal,
        total:    lineTotal,
        salesRepCommissionRate,
        salesRepCommissionAmount,
        physicianCommissionRate:   0,
        physicianCommissionAmount: 0,
        notes,
      },
    }),
    prisma.salesRepresentative.update({
      where: { id: session.userId },
      data:  { ordersCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/sales/orders");
  return { success: true, message: `Order ${orderNumber} placed successfully!`, orderNumber };
}

// ── Multi-item order from cart ───────────────────────────────────────────────

type CartOrderItem = {
  productId:   string;
  title:       string;
  variantSize: string;
  sku:         string;
  unitPrice:   number;
  quantity:    number;
  lineTotal:   number;
};

export async function createOrderFromCart(
  _state: SalesOrderState,
  formData: FormData,
): Promise<SalesOrderState> {
  const session = await requireSalesRep();

  const notes           = (formData.get("notes")           as string) || undefined;
  const shippingAddress = (formData.get("shippingAddress") as string) || undefined;
  const itemsRaw        = (formData.get("items")           as string) || "[]";

  let items: CartOrderItem[];
  try {
    items = JSON.parse(itemsRaw) as CartOrderItem[];
  } catch {
    return { message: "Invalid cart data." };
  }
  if (!items.length) return { message: "Your cart is empty." };

  const salesRepCommissionRate   = await getSalesRepCommission(session.userId);
  const subtotal                 = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
  const salesRepCommissionAmount = parseFloat(((subtotal * salesRepCommissionRate) / 100).toFixed(2));

  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  await prisma.$transaction([
    prisma.order.create({
      data: {
        orderNumber,
        salesRepId: session.userId,
        items: items as object[],
        subtotal,
        total: subtotal,
        salesRepCommissionRate,
        salesRepCommissionAmount,
        physicianCommissionRate:   0,
        physicianCommissionAmount: 0,
        shippingAddress,
        notes,
      },
    }),
    prisma.salesRepresentative.update({
      where: { id: session.userId },
      data:  { ordersCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/sales/orders");
  return { success: true, message: `Order ${orderNumber} placed!`, orderNumber };
}
