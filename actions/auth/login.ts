"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { LoginSchema } from "@/lib/validations/auth";
import { Role } from "@/app/generated/prisma/enums";

export type LoginState = {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string;
} | undefined;

const DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.ADMIN]: "/admin/dashboard",
  [Role.SALES_REP]: "/sales/shop",
  [Role.PHYSICIAN]: "/physician/dashboard",
};

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validated = LoginSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { email, password } = validated.data;

  // Check admin
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (admin) {
    const valid = await verifyPassword(password, admin.password);
    if (!valid) return { message: "Invalid email or password." };
    await createSession(admin.id, Role.ADMIN, admin.email);
    redirect(DASHBOARD_ROUTES[Role.ADMIN]);
  }

  // Check sales rep
  const salesRep = await prisma.salesRepresentative.findUnique({
    where: { email },
  });
  if (salesRep) {
    const valid = await verifyPassword(password, salesRep.password);
    if (!valid) return { message: "Invalid email or password." };
    await createSession(salesRep.id, Role.SALES_REP, salesRep.email);
    redirect(DASHBOARD_ROUTES[Role.SALES_REP]);
  }

  // Check physician
  const physician = await prisma.partneringPhysician.findUnique({
    where: { email },
  });
  if (physician) {
    if (physician.isApproved !== "APPROVED") {
      return {
        message:
          physician.isApproved === "PENDING"
            ? "Your account is pending admin approval."
            : "Your account has been rejected.",
      };
    }
    const valid = await verifyPassword(password, physician.password);
    if (!valid) return { message: "Invalid email or password." };
    await createSession(physician.id, Role.PHYSICIAN, physician.email);
    redirect(DASHBOARD_ROUTES[Role.PHYSICIAN]);
  }

  return { message: "Invalid email or password." };
}
