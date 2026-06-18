"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSalesRep } from "@/lib/auth/dal";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { CreatePhysicianSchema } from "@/lib/validations/physician";
import { Role, ApprovalStatus } from "@/app/generated/prisma/enums";

export type AddPhysicianState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function salesRepAddPhysician(
  _state: AddPhysicianState,
  formData: FormData
): Promise<AddPhysicianState> {
  const session = await requireSalesRep();

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
    commission: Number(formData.get("commission") ?? 0),
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

  // Sales rep-added physicians are PENDING until admin approves
  await prisma.partneringPhysician.create({
    data: {
      ...rest,
      password: hashed,
      isApproved: ApprovalStatus.PENDING,
      addedByRole: Role.SALES_REP,
      salesRepId: session.userId,
      websiteLink: rest.websiteLink || null,
    },
  });

  revalidatePath("/sales/physicians");
  return {
    success: true,
    message: "Physician submitted for admin approval.",
  };
}

export async function listMyPhysicians(filters?: { approvalStatus?: ApprovalStatus }) {
  const session = await requireSalesRep();

  return prisma.partneringPhysician.findMany({
    where: {
      salesRepId: session.userId,
      ...(filters?.approvalStatus ? { isApproved: filters.approvalStatus } : {}),
    },
    select: {
      id: true,
      isApproved: true,
      firstName: true,
      lastName: true,
      email: true,
      nameOfPractice: true,
      phone: true,
      commission: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
