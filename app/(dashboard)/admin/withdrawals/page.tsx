import { requireAdmin }          from "@/lib/auth/dal";
import { prisma }                from "@/lib/db/prisma";
import { PageHeader }            from "@/components/admin/page-header";
import { AllWithdrawalsTable }   from "@/components/admin/all-withdrawals-table";

export const metadata = { title: "Withdrawal Requests – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function WithdrawalsPage() {
  await requireAdmin();

  // Single query — unified model
  const requests = await prisma.withdrawRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Batch-fetch user details for display
  const repIds = [...new Set(requests.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId))];
  const drIds  = [...new Set(requests.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId))];

  const [reps, physicians] = await Promise.all([
    repIds.length
      ? prisma.salesRepresentative.findMany({
          where:  { id: { in: repIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true, walletBalance: true },
        })
      : [],
    drIds.length
      ? prisma.partneringPhysician.findMany({
          where:  { id: { in: drIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true, walletBalance: true },
        })
      : [],
  ]);

  type UserInfo = { id: string; firstName: string; lastName: string; email: string; bankName: string | null; bankAccountNumber: string | null; bankAccountName: string | null; walletBalance: number | null };
  const repMap = new Map((reps as UserInfo[]).map((r) => [r.id, r]));
  const drMap  = new Map((physicians as UserInfo[]).map((p) => [p.id, p]));

  const pending    = requests.filter((r) => r.status === "PENDING").length;
  const approved   = requests.filter((r) => r.status === "APPROVED").length;
  const totalPaid  = requests.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Withdrawal Requests"
        description="Review and process sales rep and doctor wallet withdrawal requests"
      />

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Pending Review", value: pending,          color: "#f59e0b", text: "text-amber-600" },
          { label: "Approved",       value: approved,         color: "#10b981", text: "text-emerald-600" },
          { label: "Total Paid Out", value: fmt(totalPaid),   color: "#3DBFA4", text: "text-[#3DBFA4]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <AllWithdrawalsTable requests={requests} repMap={repMap} drMap={drMap} />
    </div>
  );
}
