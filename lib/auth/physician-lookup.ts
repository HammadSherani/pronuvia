import { prisma } from "@/lib/db/prisma";
import { normalizeLoginIdentifier } from "@/lib/validations/login-id";

export async function findPhysicianByLoginIdentifier(identifier: string) {
  const normalized = normalizeLoginIdentifier(identifier);

  return prisma.partneringPhysician.findFirst({
    where: {
      OR: [{ email: normalized }, { loginId: normalized }],
    },
  });
}

export async function isLoginIdTaken(loginId: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.partneringPhysician.findUnique({
    where: { loginId },
    select: { id: true },
  });
  return !!existing && existing.id !== excludeId;
}
