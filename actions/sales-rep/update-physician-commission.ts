"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSalesRep } from "@/lib/auth/dal";

export async function updatePhysicianCommission(
  physicianId: string,
  commission: number,
): Promise<{ success: boolean; message: string }> {
  const session = await requireSalesRep();

  if (isNaN(commission) || commission < 0 || commission > 100) {
    return { success: false, message: "Commission must be between 0 and 100." };
  }

  const physician = await prisma.partneringPhysician.findUnique({
    where:  { id: physicianId },
    select: { salesRepId: true },
  });

  if (!physician || physician.salesRepId !== session.userId) {
    return { success: false, message: "Physician not found or unauthorized." };
  }

  await prisma.partneringPhysician.update({
    where: { id: physicianId },
    data:  { commission },
  });

  revalidatePath("/sales/physicians");
  return { success: true, message: "Commission updated." };
}
