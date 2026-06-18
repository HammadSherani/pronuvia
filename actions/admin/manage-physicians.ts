"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { CreatePhysicianSchema, UpdatePhysicianSchema } from "@/lib/validations/physician";
import { Role, ApprovalStatus } from "@/app/generated/prisma/enums";
import { sendMail } from "@/lib/email/mailer";
import { physicianWelcomeEmail, salesRepPhysicianAssignedEmail } from "@/lib/email/templates";

export type PhysicianActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
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
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
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
  };

  const validated = CreatePhysicianSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const exists = await prisma.partneringPhysician.findUnique({
    where: { email: validated.data.email },
  });
  if (exists) {
    return { errors: { email: ["A physician with this email already exists."] } };
  }

  const { password, confirmPassword: _cp, ...rest } = validated.data;
  void _cp;
  const hashed = await hashPassword(password);

  // Admin-added physicians are auto-approved
  await prisma.partneringPhysician.create({
    data: {
      ...rest,
      password: hashed,
      isApproved: ApprovalStatus.APPROVED,
      addedByRole: Role.ADMIN,
      addedByAdminId: session.userId,
      websiteLink: rest.websiteLink || null,
    },
  });

  // 1) Welcome email to the physician with credentials
  const drEmail = physicianWelcomeEmail({
    firstName:      rest.firstName,
    lastName:       rest.lastName,
    email:          rest.email,
    password,
    nameOfPractice: rest.nameOfPractice,
  });
  sendMail({ to: rest.email, subject: drEmail.subject, html: drEmail.html }).catch((err) =>
    console.error("[email] physicianWelcome failed:", err)
  );

  // 2) If assigned to a sales rep, notify them
  if (rest.salesRepId) {
    const salesRep = await prisma.salesRepresentative.findUnique({
      where: { id: rest.salesRepId },
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
  return { success: true, message: "Physician created and approved successfully." };
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
  };

  const validated = UpdatePhysicianSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const physician = await prisma.partneringPhysician.findUnique({ where: { id } });
  if (!physician) {
    return { message: "Physician not found." };
  }

  await prisma.partneringPhysician.update({
    where: { id },
    data: validated.data,
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
      addressOne: true, addressTwo: true, city: true, state: true, zipCode: true,
      nameOfPractice: true, yearsInPractice: true, fieldsOfSpeciality: true,
      commission: true, uplineCommission: true,
      bankName: true, bankAccountNumber: true, bankAccountName: true,
      addedByRole: true, salesRepId: true,
      salesRep: { select: { name: true, email: true } },
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
