"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/db/prisma";
import { requireAdmin }   from "@/lib/auth/dal";
import { Role }           from "@/generated/prisma/enums";

export type WithdrawalActionState = {
  success?: boolean;
  message?: string;
} | undefined;

async function deductWallet(userId: string, userRole: Role, amount: number, description: string) {
  if (userRole === "SALES_REP") {
    const rep = await prisma.salesRepresentative.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    const newBalance = Math.max(0, (rep?.walletBalance ?? 0) - amount);
    await prisma.salesRepresentative.update({ where: { id: userId }, data: { walletBalance: newBalance } });
    await prisma.walletTransaction.create({ data: { userId, userRole, amount, type: "DEBIT", description, balance: newBalance } });
  } else {
    const physician = await prisma.partneringPhysician.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    const newBalance = Math.max(0, (physician?.walletBalance ?? 0) - amount);
    await prisma.partneringPhysician.update({ where: { id: userId }, data: { walletBalance: newBalance } });
    await prisma.walletTransaction.create({ data: { userId, userRole, amount, type: "DEBIT", description, balance: newBalance } });
  }
}

export async function updateWithdrawRequest(
  requestId: string,
  action:    "APPROVED" | "REJECTED",
  adminNote?: string,
): Promise<WithdrawalActionState> {
  await requireAdmin();

  const request = await prisma.withdrawRequest.findUnique({
    where:  { id: requestId },
    select: { id: true, status: true, amount: true, userId: true, userRole: true },
  });

  if (!request) return { success: false, message: "Request not found." };
  if (request.status !== "PENDING") return { success: false, message: "Only pending requests can be updated." };

  await prisma.withdrawRequest.update({
    where: { id: requestId },
    data:  { status: action, adminNote: adminNote?.trim() || null },
  });

  if (action === "APPROVED") {
    await deductWallet(request.userId, request.userRole as Role, request.amount, "Withdrawal approved by admin");
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/sales/wallet");
  revalidatePath("/physician/wallet");
  return { success: true, message: `Request ${action.toLowerCase()} successfully.` };
}

export async function bulkUpdateWithdrawals(
  ids:    string[],
  action: "APPROVED" | "REJECTED",
): Promise<{ success: boolean; processed: number; failed: number; message: string }> {
  await requireAdmin();

  if (!ids.length) return { success: false, processed: 0, failed: 0, message: "No IDs provided." };

  let processed = 0;
  let failed    = 0;

  for (const id of ids) {
    const request = await prisma.withdrawRequest.findUnique({
      where:  { id },
      select: { id: true, status: true, amount: true, userId: true, userRole: true },
    });

    if (!request || request.status !== "PENDING") { failed++; continue; }

    await prisma.withdrawRequest.update({ where: { id }, data: { status: action } });

    if (action === "APPROVED") {
      await deductWallet(request.userId, request.userRole as Role, request.amount, "Withdrawal approved by admin (bulk)");
    }

    processed++;
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/sales/wallet");
  revalidatePath("/physician/wallet");

  const verb = action === "APPROVED" ? "approved" : "rejected";
  return {
    success:   processed > 0,
    processed,
    failed,
    message:   failed > 0
      ? `${processed} ${verb}, ${failed} skipped (already processed).`
      : `${processed} request${processed !== 1 ? "s" : ""} ${verb} successfully.`,
  };
}
