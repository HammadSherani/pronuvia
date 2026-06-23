"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export type PhysicianWithdrawalActionState = {
  success?: boolean;
  message?: string;
} | undefined;

export async function updatePhysicianWithdrawRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  adminNote?: string,
): Promise<PhysicianWithdrawalActionState> {
  await requireAdmin();

  const request = await prisma.physicianWithdrawRequest.findUnique({
    where:  { id: requestId },
    select: { id: true, status: true, amount: true, physicianId: true },
  });

  if (!request) return { success: false, message: "Request not found." };
  if (request.status !== "PENDING") {
    return { success: false, message: "Only pending requests can be updated." };
  }

  await prisma.physicianWithdrawRequest.update({
    where: { id: requestId },
    data:  { status: action, adminNote: adminNote?.trim() || null },
  });

  if (action === "APPROVED") {
    const physician = await prisma.partneringPhysician.findUnique({
      where:  { id: request.physicianId },
      select: { walletBalance: true },
    });
    const currentBalance = physician?.walletBalance ?? 0;
    const newBalance     = Math.max(0, currentBalance - request.amount);

    await prisma.partneringPhysician.update({
      where: { id: request.physicianId },
      data:  { walletBalance: newBalance },
    });

    await prisma.physicianWalletTransaction.create({
      data: {
        physicianId: request.physicianId,
        amount:      request.amount,
        type:        "DEBIT",
        description: "Withdrawal approved by admin",
        balance:     newBalance,
      },
    });
  }

  revalidatePath("/admin/physician-withdrawals");
  revalidatePath("/physician/wallet");
  return { success: true, message: `Request ${action.toLowerCase()} successfully.` };
}

export async function bulkUpdatePhysicianWithdrawals(
  ids:    string[],
  action: "APPROVED" | "REJECTED",
): Promise<{ success: boolean; processed: number; failed: number; message: string }> {
  await requireAdmin();

  if (!ids.length) return { success: false, processed: 0, failed: 0, message: "No IDs provided." };

  let processed = 0;
  let failed    = 0;

  for (const id of ids) {
    const request = await prisma.physicianWithdrawRequest.findUnique({
      where:  { id },
      select: { id: true, status: true, amount: true, physicianId: true },
    });

    if (!request || request.status !== "PENDING") { failed++; continue; }

    await prisma.physicianWithdrawRequest.update({
      where: { id },
      data:  { status: action },
    });

    if (action === "APPROVED") {
      const physician  = await prisma.partneringPhysician.findUnique({ where: { id: request.physicianId }, select: { walletBalance: true } });
      const newBalance = Math.max(0, (physician?.walletBalance ?? 0) - request.amount);

      await prisma.partneringPhysician.update({
        where: { id: request.physicianId },
        data:  { walletBalance: newBalance },
      });

      await prisma.physicianWalletTransaction.create({
        data: {
          physicianId: request.physicianId,
          amount:      request.amount,
          type:        "DEBIT",
          description: "Withdrawal approved by admin (bulk)",
          balance:     newBalance,
        },
      });
    }

    processed++;
  }

  revalidatePath("/admin/physician-withdrawals");
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
