"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { CreateSalesRepSchema, UpdateSalesRepSchema } from "@/lib/validations/sales-rep";
import { sendMail } from "@/lib/email/mailer";
import { salesRepWelcomeEmail } from "@/lib/email/templates";
import { z } from "zod";

export type SalesRepActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

function parseCreate(formData: FormData) {
  return {
    firstName:         (formData.get("firstName")         as string)?.trim() || "",
    lastName:          (formData.get("lastName")          as string)?.trim() || "",
    email:             (formData.get("email")             as string)?.trim() || "",
    phone:             (formData.get("phone")             as string) || undefined,
    password:          (formData.get("password")          as string) || "",
    confirmPassword:   (formData.get("confirmPassword")   as string) || "",
    commission:        Number(formData.get("commission") ?? 0),
    billingAddress:    (formData.get("billingAddress")    as string) || undefined,
    shippingAddress:   (formData.get("shippingAddress")   as string) || undefined,
    bankName:          (formData.get("bankName")          as string) || undefined,
    bankAccountNumber: (formData.get("bankAccountNumber") as string) || undefined,
    bankAccountName:   (formData.get("bankAccountName")   as string) || undefined,
  };
}

function parseUpdate(formData: FormData) {
  const num = (k: string) => { const v = formData.get(k); return v ? Number(v) : undefined; };
  return {
    firstName:         (formData.get("firstName")         as string)?.trim() || undefined,
    lastName:          (formData.get("lastName")          as string)?.trim() || undefined,
    email:             (formData.get("email")             as string)?.trim() || undefined,
    phone:             (formData.get("phone")             as string) || undefined,
    commission:        num("commission"),
    billingAddress:    (formData.get("billingAddress")    as string) || undefined,
    shippingAddress:   (formData.get("shippingAddress")   as string) || undefined,
    bankName:          (formData.get("bankName")          as string) || undefined,
    bankAccountNumber: (formData.get("bankAccountNumber") as string) || undefined,
    bankAccountName:   (formData.get("bankAccountName")   as string) || undefined,
  };
}

export async function createSalesRep(
  _state: SalesRepActionState,
  formData: FormData
): Promise<SalesRepActionState> {
  await requireAdmin();

  const validated = CreateSalesRepSchema.safeParse(parseCreate(formData));
  if (!validated.success) return { errors: z.flattenError(validated.error).fieldErrors };

  const { confirmPassword, password, ...data } = validated.data;
  void confirmPassword;

  const exists = await prisma.salesRepresentative.findUnique({ where: { email: data.email } });
  if (exists) return { errors: { email: ["A sales rep with this email already exists."] } };

  const hashed = await hashPassword(password);
  await prisma.salesRepresentative.create({
    data: {
      ...data,
      name: `${data.firstName} ${data.lastName}`,
      password: hashed,
      commission: data.commission ?? 0,
    },
  });

  // Send welcome email — fire-and-forget (don't block on failure)
  const { subject, html } = salesRepWelcomeEmail({
    firstName: data.firstName,
    lastName:  data.lastName,
    email:     data.email,
    password,
  });
  sendMail({ to: data.email, subject, html }).catch((err) =>
    console.error("[email] salesRepWelcome failed:", err)
  );

  revalidatePath("/admin/sales-reps");
  return { success: true, message: "Sales representative created successfully." };
}

export async function updateSalesRep(
  id: string,
  _state: SalesRepActionState,
  formData: FormData
): Promise<SalesRepActionState> {
  await requireAdmin();

  const validated = UpdateSalesRepSchema.safeParse(parseUpdate(formData));
  if (!validated.success) return { errors: z.flattenError(validated.error).fieldErrors };

  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return { message: "Sales representative not found." };

  const data = validated.data;

  if (data.email && data.email !== existing.email) {
    const taken = await prisma.salesRepresentative.findUnique({ where: { email: data.email } });
    if (taken) return { errors: { email: ["This email is already in use."] } };
  }

  const firstName = data.firstName ?? existing.firstName;
  const lastName  = data.lastName  ?? existing.lastName;

  await prisma.salesRepresentative.update({
    where: { id },
    data: { ...data, name: `${firstName} ${lastName}` },
  });

  revalidatePath("/admin/sales-reps");
  revalidatePath(`/admin/sales-reps/${id}`);
  return { success: true, message: "Sales representative updated successfully." };
}

export async function updateSalesRepCommission(
  id: string,
  commission: number,
): Promise<SalesRepActionState> {
  await requireAdmin();

  if (commission < 0 || commission > 100) {
    return { message: "Commission must be between 0 and 100." };
  }

  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return { message: "Sales representative not found." };

  await prisma.salesRepresentative.update({ where: { id }, data: { commission } });

  revalidatePath("/admin/physicians");
  revalidatePath("/admin/sales-reps");
  revalidatePath(`/admin/sales-reps/${id}`);
  return { success: true, message: "Commission updated." };
}

export async function deleteSalesRep(id: string): Promise<SalesRepActionState> {
  await requireAdmin();
  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return { message: "Sales representative not found." };
  await prisma.salesRepresentative.delete({ where: { id } });
  revalidatePath("/admin/sales-reps");
  return { success: true, message: "Sales representative deleted." };
}

export async function listSalesReps() {
  await requireAdmin();
  return prisma.salesRepresentative.findMany({
    select: {
      id: true, name: true, firstName: true, lastName: true,
      email: true, phone: true, commission: true, ordersCount: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSalesRepById(id: string) {
  await requireAdmin();
  return prisma.salesRepresentative.findUnique({
    where: { id },
    select: {
      id: true, name: true, firstName: true, lastName: true, email: true,
      phone: true, commission: true, ordersCount: true,
      billingAddress: true, shippingAddress: true,
      bankName: true, bankAccountNumber: true, bankAccountName: true,
      createdAt: true, updatedAt: true,
      physicians: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          nameOfPractice: true, uplineCommission: true, commission: true,
          ordersCount: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
