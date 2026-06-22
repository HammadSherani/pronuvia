"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { ApprovalStatus } from "@/app/generated/prisma/enums";
import { generateResetToken } from "@/lib/auth/reset-token";
import { sendMail } from "@/lib/email/mailer";
import { passwordSetupEmail } from "@/lib/email/templates";

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
  id: string,
  commission: number,
): Promise<ApprovalActionState> {
  await requireAdmin();

  if (commission < 0 || commission > 100) {
    return { message: "Commission must be between 0 and 100." };
  }

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  if (physician.isApproved !== ApprovalStatus.PENDING) {
    return { message: "Physician is not in a pending state." };
  }

  const { token, expiry } = generateResetToken();

  await prisma.partneringPhysician.update({
    where: { id },
    data: {
      isApproved:          ApprovalStatus.APPROVED,
      commission,
      passwordResetToken:  token,
      passwordResetExpiry: expiry,
    },
  });

  // Send password setup email to the physician
  const setupEmail = passwordSetupEmail({
    firstName:  physician.firstName,
    email:      physician.email,
    resetToken: token,
    role:       "physician",
  });
  sendMail({ to: physician.email, subject: setupEmail.subject, html: setupEmail.html }).catch((err) =>
    console.error("[email] physicianApprovedSetupPassword failed:", err)
  );

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

