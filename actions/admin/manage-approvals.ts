"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { ApprovalStatus } from "@/app/generated/prisma/enums";

export type ApprovalActionState = {
  message?: string;
  success?: boolean;
} | undefined;

export async function listPendingPhysicians() {
  await requireAdmin();

  return prisma.partneringPhysician.findMany({
    where: { isApproved: ApprovalStatus.PENDING },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      nameOfPractice: true,
      license: true,
      phone: true,
      commission: true,
      salesRep: { select: { id: true, name: true, email: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function approvePhysician(
  id: string
): Promise<ApprovalActionState> {
  await requireAdmin();

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  if (physician.isApproved !== ApprovalStatus.PENDING) {
    return { message: "Physician is not in a pending state." };
  }

  await prisma.partneringPhysician.update({
    where: { id },
    data: { isApproved: ApprovalStatus.APPROVED },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/physicians");
  return { success: true, message: "Physician approved successfully." };
}

export async function rejectPhysician(
  id: string
): Promise<ApprovalActionState> {
  await requireAdmin();

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  if (physician.isApproved !== ApprovalStatus.PENDING) {
    return { message: "Physician is not in a pending state." };
  }

  await prisma.partneringPhysician.update({
    where: { id },
    data: { isApproved: ApprovalStatus.REJECTED },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/physicians");
  return { success: true, message: "Physician rejected." };
}
