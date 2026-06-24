import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PhysiciansPageClient } from "@/components/admin/physicians-page-client";

export const metadata = { title: "Physicians – Pronuvia Admin" };

export default async function PhysiciansPage() {
  await requireAdmin();

  const [physicians, salesReps, recentOrders, pendingWithdrawals] = await Promise.all([
    prisma.partneringPhysician.findMany({
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
    }),

    prisma.salesRepresentative.findMany({
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, commission: true,
        walletBalance: true, createdAt: true,
        physicians: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, nameOfPractice: true,
            commission: true, uplineCommission: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.order.findMany({
      where: {
        OR: [
          { salesRepCommissionAmount: { gt: 0 } },
          { physicianCommissionAmount: { gt: 0 } },
        ],
      },
      select: {
        id: true, orderNumber: true, createdAt: true,
        salesRepId: true, physicianId: true,
        salesRepCommissionAmount: true,
        physicianCommissionAmount: true,
        commissionPaid: true, status: true,
        salesRep: { select: { firstName: true, lastName: true } },
        physician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    prisma.withdrawRequest.findMany({
      where:  { status: "PENDING", userRole: "SALES_REP" },
      select: { userId: true },
    }),
  ]);

  const pendingRepIds = new Set(pendingWithdrawals.map((w) => w.userId));

  return (
    <PhysiciansPageClient
      physicians={physicians}
      salesReps={salesReps}
      recentOrders={recentOrders}
      pendingRepIds={[...pendingRepIds]}
    />
  );
}
