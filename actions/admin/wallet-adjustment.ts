"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function adjustWallet(data: {
  salesRepId: string;
  type:       "CREDIT" | "DEBIT";
  amount:     number;
  note:       string;
}): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  const { salesRepId, type, amount, note } = data;

  if (!amount || amount <= 0) return { success: false, message: "Amount must be greater than 0." };
  if (!note.trim())          return { success: false, message: "Note is required." };

  const rep = await prisma.salesRepresentative.findUnique({
    where:  { id: salesRepId },
    select: { walletBalance: true },
  });
  if (!rep) return { success: false, message: "Sales rep not found." };

  const current    = rep.walletBalance ?? 0;
  const newBalance = type === "CREDIT"
    ? current + amount
    : Math.max(0, current - amount);

  await prisma.salesRepresentative.update({
    where: { id: salesRepId },
    data:  { walletBalance: newBalance },
  });

  await prisma.walletTransaction.create({
    data: {
      salesRepId,
      amount,
      type,
      description: `Admin adjustment: ${note.trim()}`,
      balance:     newBalance,
    },
  });

  revalidatePath("/admin/wallet-adjustment");
  revalidatePath("/sales/wallet");

  const verb = type === "CREDIT" ? "added to" : "deducted from";
  return {
    success: true,
    message: `$${amount.toFixed(2)} ${verb} wallet. New balance: $${newBalance.toFixed(2)}.`,
  };
}
