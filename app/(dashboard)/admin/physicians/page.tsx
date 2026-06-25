import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PhysiciansPageClient } from "@/components/admin/physicians-page-client";

export const metadata = { title: "Physicians – Pronuvia Admin" };

export default async function PhysiciansPage() {
  await requireAdmin();

  const physicians = await prisma.partneringPhysician.findMany({
    select: {
      id: true, isApproved: true,
      firstName: true, lastName: true, email: true,
      nameOfPractice: true, phone: true,
      commission: true, uplineCommission: true,
      addedByRole: true, salesRepId: true,
      salesRep: { select: { id: true, name: true, email: true, commission: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PhysiciansPageClient physicians={physicians} />
  );
}
