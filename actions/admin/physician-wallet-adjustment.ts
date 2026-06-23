"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function adjustPhysicianWallet(data: {
  physicianId: string;
  type:        "CREDIT" | "DEBIT";
  amount:      number;
  note:        string;
}): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  const { physicianId, type, amount, note } = data;

  if (!amount || amount <= 0) return { success: false, message: "Amount must be greater than 0." };
  if (!note.trim())           return { success: false, message: "Note is required." };

  const physician = await prisma.partneringPhysician.findUnique({
    where:  { id: physicianId },
    select: { walletBalance: true },
  });
  if (!physician) return { success: false, message: "Physician not found." };

  const current    = physician.walletBalance ?? 0;
  const newBalance = type === "CREDIT"
    ? current + amount
    : Math.max(0, current - amount);

  await prisma.partneringPhysician.update({
    where: { id: physicianId },
    data:  { walletBalance: newBalance },
  });

  await prisma.physicianWalletTransaction.create({
    data: {
      physicianId,
      amount,
      type,
      description: `Admin adjustment: ${note.trim()}`,
      balance:     newBalance,
    },
  });

  revalidatePath("/admin/physician-wallet-adjustment");
  revalidatePath("/physician/wallet");

  const verb = type === "CREDIT" ? "added to" : "deducted from";
  return {
    success: true,
    message: `$${amount.toFixed(2)} ${verb} wallet. New balance: $${newBalance.toFixed(2)}.`,
  };
}
