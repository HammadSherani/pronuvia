"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { ApprovalStatus } from "@/generated/prisma/enums";
import { generateResetToken } from "@/lib/auth/reset-token";
import { sendMail } from "@/lib/email/mailer";
import { physicianApprovalEmail, welcomeAboardEmail, salesRepDoctorApprovedEmail } from "@/lib/email/templates";

const APPROVAL_ATTACHMENTS_DIR = path.join(process.cwd(), "lib/email/attachments/application-approval");
const WELCOME_ATTACHMENTS_DIR  = path.join(process.cwd(), "lib/email/attachments/welcome-aboard");

const approvalAttachments = [
  { filename: "AIC Therapy Dosing Protocol.pdf",         path: path.join(APPROVAL_ATTACHMENTS_DIR, "ACRI AIC Therapy Dosing Protocol 2024 V3 Final_compressed.pdf") },
  { filename: "AIC Booklet.pdf",                         path: path.join(APPROVAL_ATTACHMENTS_DIR, "AIC Therapy Intro Booklet_v2.pdf") },
  { filename: "AIC Brochure.pdf",                        path: path.join(APPROVAL_ATTACHMENTS_DIR, "AIC_Brochure_9x16_050222.pdf") },
  { filename: "B2B Terms and Conditions.pdf",            path: path.join(APPROVAL_ATTACHMENTS_DIR, "B2B Terms and Conditions for Doctor 08132020.pdf") },
  { filename: "W-9 Form.pdf",                            path: path.join(APPROVAL_ATTACHMENTS_DIR, "fw9.pdf") },
];

const welcomeAttachments = [
  { filename: "AIC Booklet.pdf",                   path: path.join(WELCOME_ATTACHMENTS_DIR, "AIC Therapy Intro Booklet_v2.pdf") },
  { filename: "AIC Therapy Dosing Protocol.pdf",   path: path.join(WELCOME_ATTACHMENTS_DIR, "ACRI AIC Therapy Dosing Protocol 2024 V3 Final_compressed.pdf") },
  { filename: "AIC Brochure.pdf",                  path: path.join(WELCOME_ATTACHMENTS_DIR, "AIC_Brochure_9x16_050222.pdf") },
  { filename: "AIC for Calcium Signaling.pdf",     path: path.join(WELCOME_ATTACHMENTS_DIR, "Book_Final_CBHI-PDF_AIC.pdf") },
];

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

export async function approvePhysician(id: string): Promise<ApprovalActionState> {
  await requireAdmin();

  const physician = await prisma.partneringPhysician.findUnique({
    where: { id },
    include: { salesRep: { select: { email: true } } },
  });
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
      passwordResetToken:  token,
      passwordResetExpiry: expiry,
    },
  });

  // Email 1: Account approval with password setup link
  const setupEmail = physicianApprovalEmail({
    firstName:  physician.firstName,
    lastName:   physician.lastName,
    email:      physician.email,
    resetToken: token,
  });
  sendMail({ to: physician.email, subject: setupEmail.subject, html: setupEmail.html, attachments: approvalAttachments }).catch((err) =>
    console.error("[email] physicianApprovalEmail failed:", err)
  );

  // Email 2: Welcome Aboard with AIC resources + PDF attachments
  const boardEmail = welcomeAboardEmail({
    firstName: physician.firstName,
    lastName:  physician.lastName,
  });
  sendMail({ to: physician.email, subject: boardEmail.subject, html: boardEmail.html, attachments: welcomeAttachments }).catch((err) =>
    console.error("[email] welcomeAboardEmail failed:", err)
  );

  // Email 3: Notify sales rep if this doctor was added by one
  if (physician.salesRep?.email) {
    const srEmail = salesRepDoctorApprovedEmail({
      doctorFirstName: physician.firstName,
      doctorLastName:  physician.lastName,
    });
    sendMail({ to: physician.salesRep.email, subject: srEmail.subject, html: srEmail.html }).catch((err) =>
      console.error("[email] salesRepDoctorApprovedEmail failed:", err)
    );
  }

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

