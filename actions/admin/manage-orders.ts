"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { z } from "zod";
import { OrderStatus } from "@/app/generated/prisma/enums";

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
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };

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
  await prisma.$transaction([
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
      salesRepCommissionAmount: true,
      commissionPaid: true,
    },
  });
  if (!order) return { message: "Order not found." };

  const isCompletingWithCommission =
    status === OrderStatus.COMPLETED &&
    !!order.salesRepId &&
    order.salesRepCommissionAmount > 0;

  if (isCompletingWithCommission) {
    const rep = await prisma.salesRepresentative.findUnique({
      where:  { id: order.salesRepId! },
      select: { walletBalance: true },
    });

    const walletBalance = rep?.walletBalance;

    // Credit if not yet paid, OR if previous run set commissionPaid=true but
    // wallet was never actually updated (walletBalance is still null)
    const alreadyCredited = order.commissionPaid && walletBalance !== null;

    if (!alreadyCredited) {
      const currentBalance = walletBalance ?? 0;
      const newBalance     = currentBalance + order.salesRepCommissionAmount;

      await prisma.salesRepresentative.update({
        where: { id: order.salesRepId! },
        data:  { walletBalance: newBalance },
      });

      await prisma.walletTransaction.create({
        data: {
          salesRepId:  order.salesRepId!,
          amount:      order.salesRepCommissionAmount,
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
      ...(isCompletingWithCommission && { commissionPaid: true }),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/sales/wallet");
  return { success: true, message: "Order status updated." };
}

export async function deleteOrder(id: string): Promise<OrderActionState> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { message: "Order not found." };

  // Decrement counters
  await prisma.$transaction([
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

export async function listOrders() {
  await requireAdmin();
  return prisma.order.findMany({
    select: {
      id: true, orderNumber: true, status: true, total: true,
      subtotal: true,
      salesRepCommissionRate: true, salesRepCommissionAmount: true,
      physicianCommissionRate: true, physicianCommissionAmount: true,
      paymentMethod: true, paymentStatus: true, transactionId: true,
      physician: { select: { firstName: true, lastName: true, nameOfPractice: true } },
      salesRep:  { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { id },
    include: {
      physician: { select: { id: true, firstName: true, lastName: true, email: true, nameOfPractice: true, commission: true } },
      salesRep:  { select: { id: true, name: true, email: true, commission: true } },
    },
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
