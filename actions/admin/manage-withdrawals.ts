"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export type WithdrawalActionState = {
  success?: boolean;
  message?: string;
} | undefined;

export async function updateWithdrawRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  adminNote?: string,
): Promise<WithdrawalActionState> {
  await requireAdmin();

  const request = await prisma.withdrawRequest.findUnique({
    where:  { id: requestId },
    select: { id: true, status: true, amount: true, salesRepId: true },
  });

  if (!request) return { success: false, message: "Request not found." };
  if (request.status !== "PENDING") {
    return { success: false, message: "Only pending requests can be updated." };
  }

  await prisma.withdrawRequest.update({
    where: { id: requestId },
    data:  { status: action, adminNote: adminNote?.trim() || null },
  });

  // On approval, deduct from sales rep wallet balance
  if (action === "APPROVED") {
    const rep = await prisma.salesRepresentative.findUnique({
      where:  { id: request.salesRepId },
      select: { walletBalance: true },
    });
    const currentBalance = rep?.walletBalance ?? 0;
    const newBalance     = Math.max(0, currentBalance - request.amount);

    await prisma.salesRepresentative.update({
      where: { id: request.salesRepId },
      data:  { walletBalance: newBalance },
    });

    await prisma.walletTransaction.create({
      data: {
        salesRepId:  request.salesRepId,
        amount:      request.amount,
        type:        "DEBIT",
        description: "Withdrawal approved by admin",
        balance:     newBalance,
      },
    });
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/sales/wallet");
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
      select: { id: true, status: true, amount: true, salesRepId: true },
    });

    if (!request || request.status !== "PENDING") { failed++; continue; }

    await prisma.withdrawRequest.update({
      where: { id },
      data:  { status: action },
    });

    if (action === "APPROVED") {
      const rep        = await prisma.salesRepresentative.findUnique({ where: { id: request.salesRepId }, select: { walletBalance: true } });
      const newBalance = Math.max(0, (rep?.walletBalance ?? 0) - request.amount);

      await prisma.salesRepresentative.update({
        where: { id: request.salesRepId },
        data:  { walletBalance: newBalance },
      });

      await prisma.walletTransaction.create({
        data: {
          salesRepId:  request.salesRepId,
          amount:      request.amount,
          type:        "DEBIT",
          description: "Withdrawal approved by admin (bulk)",
          balance:     newBalance,
        },
      });
    }

    processed++;
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/sales/wallet");

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
