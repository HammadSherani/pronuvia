import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { PhysicianWithdrawalsTableClient } from "@/components/admin/physician-withdrawals-table-client";

export const metadata = { title: "Physician Withdrawal Requests – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function PhysicianWithdrawalsPage() {
  await requireAdmin();

  const requests = await prisma.physicianWithdrawRequest.findMany({
    include: {
      physician: {
        select: {
          firstName: true, lastName: true, email: true,
          bankName: true, bankAccountNumber: true, bankAccountName: true,
          walletBalance: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending          = requests.filter((r) => r.status === "PENDING").length;
  const approved         = requests.filter((r) => r.status === "APPROVED").length;
  const totalApprovedAmt = requests.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Physician Withdrawal Requests"
        description="Review and process physician wallet withdrawal requests"
      />

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Pending Review", value: pending,               color: "#f59e0b", text: "text-amber-600" },
          { label: "Approved",       value: approved,              color: "#10b981", text: "text-emerald-600" },
          { label: "Total Paid Out", value: fmt(totalApprovedAmt), color: "#3DBFA4", text: "text-[#3DBFA4]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-1">
        <PhysicianWithdrawalsTableClient requests={requests} />
      </div>
    </div>
  );
}
