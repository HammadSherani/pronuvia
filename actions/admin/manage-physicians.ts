"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { generateResetToken, randomPlaceholderPassword } from "@/lib/auth/reset-token";
import { CreatePhysicianSchema, UpdatePhysicianSchema } from "@/lib/validations/physician";
import { Role, ApprovalStatus } from "@/generated/prisma/enums";
import { sendMail } from "@/lib/email/mailer";
import { physicianApprovalEmail, salesRepPhysicianAssignedEmail } from "@/lib/email/templates";
import { doctorRegistrationEmail } from "@/lib/email/templates";

export type PhysicianActionState = {
  errors?:  Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?:  Record<string, string>;
} | undefined;

export async function adminCreatePhysician(
  _state: PhysicianActionState,
  formData: FormData
): Promise<PhysicianActionState> {
  const session = await requireAdmin();

  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    aictherapy: (formData.get("aictherapy") as string) || undefined,
    license: (formData.get("license") as string) || undefined,
    websiteLink: (formData.get("websiteLink") as string) || undefined,
    addressOne: (formData.get("addressOne") as string) || undefined,
    addressTwo: (formData.get("addressTwo") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    state: (formData.get("state") as string) || undefined,
    zipCode: (formData.get("zipCode") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    officeContactNumber: (formData.get("officeContactNumber") as string) || undefined,
    fax: (formData.get("fax") as string) || undefined,
    nameOfPractice: (formData.get("nameOfPractice") as string) || undefined,
    yearsInPractice: formData.get("yearsInPractice")
      ? Number(formData.get("yearsInPractice"))
      : undefined,
    fieldsOfSpeciality: formData.get("fieldsOfSpeciality")
      ? JSON.parse(formData.get("fieldsOfSpeciality") as string)
      : [],
    commission:        Number(formData.get("commission") ?? 0),
    uplineCommission:  Number(formData.get("uplineCommission") ?? 0),
    salesRepId:        (formData.get("salesRepId") as string) || undefined,
    bankName:          (formData.get("bankName") as string) || undefined,
    bankAccountNumber: (formData.get("bankAccountNumber") as string) || undefined,
    bankAccountName:   (formData.get("bankAccountName") as string) || undefined,
    swiftCode:         (formData.get("swiftCode") as string) || undefined,
    routingNumber:     (formData.get("routingNumber") as string) || undefined,
  };

  const strValues: Record<string, string> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v ?? "")])
  );

  const validated = CreatePhysicianSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors, values: strValues };
  }

  const exists = await prisma.partneringPhysician.findUnique({
    where: { email: validated.data.email },
  });
  if (exists) {
    return { errors: { email: ["A physician with this email already exists."] } };
  }

  const { salesRepId, ...rest } = validated.data;

  // Determine approval status from which submit button was clicked
  const approvalAction = formData.get("approvalAction") as string;
  const isApproved = approvalAction === "pending"
    ? ApprovalStatus.PENDING
    : ApprovalStatus.APPROVED;

  const placeholder = randomPlaceholderPassword();
  const hashed      = await hashPassword(placeholder);

  // Only generate a reset token if approving immediately
  const { token, expiry } = isApproved === ApprovalStatus.APPROVED
    ? generateResetToken()
    : { token: null, expiry: null };

  await prisma.partneringPhysician.create({
    data: {
      ...rest,
      salesRepId:          salesRepId ?? null,
      password:            hashed,
      isApproved,
      addedByRole:         Role.ADMIN,
      addedByAdminId:      session.userId,
      websiteLink:         rest.websiteLink || null,
      passwordResetToken:  token,
      passwordResetExpiry: expiry,
    },
  });

  // Registration confirmation for PENDING accounts (approval email covers the APPROVED path)
  if (isApproved === ApprovalStatus.PENDING) {
    try {
      const { subject, html } = doctorRegistrationEmail({
        firstName: rest.firstName,
        lastName:  rest.lastName,
      });
      await sendMail({ to: rest.email, subject, html });
    } catch (err) {
      console.error("[email] signup confirmation FAILED for", rest.email, err);
    }
  }

  // Send approval welcome email only when approving immediately
  if (isApproved === ApprovalStatus.APPROVED && token) {
    const drEmail = physicianApprovalEmail({
      firstName:  rest.firstName,
      lastName:   rest.lastName,
      email:      rest.email,
      resetToken: token,
    });
    sendMail({ to: rest.email, subject: drEmail.subject, html: drEmail.html }).catch((err) =>
      console.error("[email] physicianApprovalEmail failed:", err)
    );
  }

  // 2) If assigned to a sales rep, notify them
  if (salesRepId) {
    const salesRep = await prisma.salesRepresentative.findUnique({
      where: { id: salesRepId },
      select: { firstName: true, email: true },
    });
    if (salesRep) {
      const repEmail = salesRepPhysicianAssignedEmail({
        salesRepFirstName:   salesRep.firstName,
        physicianFirstName:  rest.firstName,
        physicianLastName:   rest.lastName,
        physicianEmail:      rest.email,
        nameOfPractice:      rest.nameOfPractice,
      });
      sendMail({ to: salesRep.email, subject: repEmail.subject, html: repEmail.html }).catch((err) =>
        console.error("[email] salesRepPhysicianAssigned failed:", err)
      );
    }
  }

  revalidatePath("/admin/physicians");
  return {
    success: true,
    message: isApproved === ApprovalStatus.APPROVED
      ? "Physician created and approved. Password setup email sent."
      : "Physician created and placed in pending approval.",
  };
}

export async function updatePhysician(
  id: string,
  _state: PhysicianActionState,
  formData: FormData
): Promise<PhysicianActionState> {
  await requireAdmin();

  const raw = {
    firstName: (formData.get("firstName") as string) || undefined,
    lastName: (formData.get("lastName") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    aictherapy: (formData.get("aictherapy") as string) || undefined,
    license: (formData.get("license") as string) || undefined,
    websiteLink: (formData.get("websiteLink") as string) || undefined,
    addressOne: (formData.get("addressOne") as string) || undefined,
    addressTwo: (formData.get("addressTwo") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    state: (formData.get("state") as string) || undefined,
    zipCode: (formData.get("zipCode") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    officeContactNumber: (formData.get("officeContactNumber") as string) || undefined,
    fax: (formData.get("fax") as string) || undefined,
    nameOfPractice: (formData.get("nameOfPractice") as string) || undefined,
    yearsInPractice: formData.get("yearsInPractice")
      ? Number(formData.get("yearsInPractice"))
      : undefined,
    fieldsOfSpeciality: formData.get("fieldsOfSpeciality")
      ? JSON.parse(formData.get("fieldsOfSpeciality") as string)
      : undefined,
    commission:        formData.get("commission")       ? Number(formData.get("commission"))      : undefined,
    uplineCommission:  formData.get("uplineCommission") ? Number(formData.get("uplineCommission")) : undefined,
    salesRepId:        (formData.get("salesRepId")        as string) || undefined,
    bankName:          (formData.get("bankName")           as string) || undefined,
    bankAccountNumber: (formData.get("bankAccountNumber")  as string) || undefined,
    bankAccountName:   (formData.get("bankAccountName")    as string) || undefined,
    swiftCode:         (formData.get("swiftCode")          as string) || undefined,
    routingNumber:     (formData.get("routingNumber")      as string) || undefined,
  };

  const validated = UpdatePhysicianSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  const salesRepIdToSet = (formData.get("salesRepId") as string)?.trim() || null;

  await prisma.partneringPhysician.update({
    where: { id },
    data: {
      ...validated.data,
      salesRepId: salesRepIdToSet,
    },
  });

  revalidatePath("/admin/physicians");
  return { success: true, message: "Physician updated successfully." };
}

export async function updateUplineCommission(
  physicianId: string,
  uplineCommission: number,
): Promise<PhysicianActionState> {
  await requireAdmin();

  if (uplineCommission < 0 || uplineCommission > 100) {
    return { message: "Commission must be between 0 and 100." };
  }

  const physician = await prisma.partneringPhysician.findUnique({ where: { id: physicianId } });
  if (!physician) return { message: "Physician not found." };

  await prisma.partneringPhysician.update({
    where: { id: physicianId },
    data: { uplineCommission },
  });

  revalidatePath(`/admin/physicians/${physicianId}`);
  if (physician.salesRepId) revalidatePath(`/admin/sales-reps/${physician.salesRepId}`);
  return { success: true, message: "Upline commission updated." };
}

export async function updateDoctorCommission(
  physicianId: string,
  commission: number,
): Promise<PhysicianActionState> {
  await requireAdmin();

  if (commission < 0 || commission > 100) {
    return { message: "Commission must be between 0 and 100." };
  }

  const physician = await prisma.partneringPhysician.findUnique({ where: { id: physicianId } });
  if (!physician) return { message: "Physician not found." };

  await prisma.partneringPhysician.update({
    where: { id: physicianId },
    data: { commission },
  });

  revalidatePath(`/admin/physicians/${physicianId}`);
  if (physician.salesRepId) revalidatePath(`/admin/sales-reps/${physician.salesRepId}`);
  return { success: true, message: "Doctor commission updated." };
}

export async function deletePhysician(id: string): Promise<PhysicianActionState> {
  await requireAdmin();

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  await prisma.partneringPhysician.delete({ where: { id } });
  revalidatePath("/admin/physicians");
  return { success: true, message: "Physician deleted." };
}

export async function getPhysicianById(id: string) {
  await requireAdmin();
  return prisma.partneringPhysician.findUnique({
    where: { id },
    select: {
      id: true, isApproved: true,
      firstName: true, lastName: true, email: true,
      phone: true, officeContactNumber: true, fax: true,
      aictherapy: true, license: true, websiteLink: true,
      addressOne: true, addressTwo: true, city: true, state: true, zipCode: true, country: true,
      nameOfPractice: true, yearsInPractice: true, fieldsOfSpeciality: true,
      commission: true, uplineCommission: true,
      bankName: true, bankAccountNumber: true, bankAccountName: true, swiftCode: true, routingNumber: true,
      addedByRole: true, salesRepId: true,
      salesRep: { select: { name: true, email: true, firstName: true, lastName: true } },
      createdAt: true, updatedAt: true,
    },
  });
}

export async function listPhysicians(filters?: {
  approvalStatus?: ApprovalStatus;
}) {
  await requireAdmin();

  return prisma.partneringPhysician.findMany({
    where: filters?.approvalStatus
      ? { isApproved: filters.approvalStatus }
      : undefined,
    select: {
      id: true,
      isApproved: true,
      firstName: true,
      lastName: true,
      email: true,
      nameOfPractice: true,
      phone: true,
      commission: true,
      addedByRole: true,
      salesRepId: true,
      salesRep: { select: { name: true, email: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

