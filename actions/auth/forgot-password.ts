"use server";

import { prisma } from "@/lib/db/prisma";
import { sendMail } from "@/lib/email/mailer";
import { forgotPasswordEmail } from "@/lib/email/templates";
import crypto from "crypto";

export type ForgotPasswordState = {
  message?: string;
  success?: boolean;
  errors?: { email?: string[] };
} | undefined;

export async function forgotPassword(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) return { errors: { email: ["Email is required"] } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { errors: { email: ["Enter a valid email address"] } };
  }

  const token  = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetLink = `${appUrl}/reset-password/${token}`;

  // Check physician
  const physician = await prisma.partneringPhysician.findUnique({
    where: { email },
    select: { id: true, firstName: true },
  });
  if (physician) {
    await prisma.partneringPhysician.update({
      where: { id: physician.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });
    const { subject, html } = forgotPasswordEmail({ firstName: physician.firstName, resetLink });
    await sendMail({ to: email, subject, html });
    return { success: true };
  }

  // Check sales rep
  const salesRep = await prisma.salesRepresentative.findUnique({
    where: { email },
    select: { id: true, firstName: true },
  });
  if (salesRep) {
    await prisma.salesRepresentative.update({
      where: { id: salesRep.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });
    const { subject, html } = forgotPasswordEmail({ firstName: salesRep.firstName, resetLink });
    await sendMail({ to: email, subject, html });
    return { success: true };
  }

  // Always return success — don't reveal if email exists
  return { success: true };
}
