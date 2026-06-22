import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { ApprovalsClient } from "@/components/admin/approvals-client";

export const metadata = { title: "Pending Approvals – Pronuvia Admin" };

export default async function ApprovalsPage() {
  await requireAdmin();

  const physicians = await prisma.partneringPhysician.findMany({
    where:   { isApproved: "PENDING" },
    select: {
      id: true,
      firstName: true, lastName: true, email: true,
      nameOfPractice: true, city: true, state: true,
      salesRepNote: true,
      salesRep: { select: { firstName: true, lastName: true, email: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-sm text-gray-400 mt-0.5">Physician accounts awaiting review</p>
        </div>
        {physicians.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {physicians.length} pending
          </span>
        )}
      </div>

      <ApprovalsClient physicians={physicians} />
    </div>
  );
}
