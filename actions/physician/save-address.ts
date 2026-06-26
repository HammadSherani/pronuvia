"use server";

import { requirePhysician } from "@/lib/auth/dal";
import { prisma }           from "@/lib/db/prisma";

export async function savePhysicianAddress(data: {
  address1: string; address2: string;
  city: string; state: string; zip: string;
  country: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await requirePhysician();
    await prisma.partneringPhysician.update({
      where: { id: session.userId },
      data: {
        addressOne: data.address1,
        addressTwo: data.address2 || undefined,
        city:       data.city,
        state:      data.state,
        zipCode:    data.zip,
      },
    });
    return { success: true };
  } catch {
    return { success: false, message: "Failed to save address." };
  }
}
