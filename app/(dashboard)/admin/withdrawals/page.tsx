import { requireAdmin }        from "@/lib/auth/dal";
import { prisma }              from "@/lib/db/prisma";
import { PageHeader }          from "@/components/admin/page-header";
import { AllWithdrawalsTable, type CommissionEntry } from "@/components/admin/all-withdrawals-table";

export const metadata = { title: "Commission History – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function WithdrawalsPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    where:   { commissionPaid: true },
    select: {
      id:                         true,
      orderNumber:                true,
      createdAt:                  true,
      salesRepId:                 true,
      salesRepCommissionAmount:   true,
      salesRepCommissionRate:     true,
      physicianId:                true,
      physicianCommissionAmount:  true,
      physicianCommissionRate:    true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Flatten each order into per-role commission entries
  const entries: CommissionEntry[] = [];
  for (const o of orders) {
    if (o.salesRepId && (o.salesRepCommissionAmount ?? 0) > 0) {
      entries.push({
        kind:        "rep",
        orderId:     o.id,
        orderNumber: o.orderNumber,
        userId:      o.salesRepId,
        amount:      o.salesRepCommissionAmount!,
        rate:        o.salesRepCommissionRate  ?? 0,
        createdAt:   o.createdAt.toISOString(),
      });
    }
    if (o.physicianId && (o.physicianCommissionAmount ?? 0) > 0) {
      entries.push({
        kind:        "physician",
        orderId:     o.id,
        orderNumber: o.orderNumber,
        userId:      o.physicianId,
        amount:      o.physicianCommissionAmount!,
        rate:        o.physicianCommissionRate  ?? 0,
        createdAt:   o.createdAt.toISOString(),
      });
    }
  }

  const repIds = [...new Set(entries.filter((e) => e.kind === "rep").map((e) => e.userId))];
  const drIds  = [...new Set(entries.filter((e) => e.kind === "physician").map((e) => e.userId))];

  const [reps, physicians] = await Promise.all([
    repIds.length
      ? prisma.salesRepresentative.findMany({
          where:  { id: { in: repIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
    drIds.length
      ? prisma.partneringPhysician.findMany({
          where:  { id: { in: drIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
  ]);

  type UserInfo = { id: string; firstName: string; lastName: string; email: string; bankName: string | null; bankAccountNumber: string | null; bankAccountName: string | null };
  const repMap = new Map((reps as UserInfo[]).map((r) => [r.id, r]));
  const drMap  = new Map((physicians as UserInfo[]).map((p) => [p.id, p]));

  const repTotal   = entries.filter((e) => e.kind === "rep").reduce((s, e) => s + e.amount, 0);
  const drTotal    = entries.filter((e) => e.kind === "physician").reduce((s, e) => s + e.amount, 0);
  const totalPaid  = repTotal + drTotal;

  return (
    <div>
      <PageHeader
        title="Commission History"
        description="Commissions automatically credited when orders are completed"
      />

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Total Credited", value: fmt(totalPaid), color: "#3DBFA4", text: "text-[#3DBFA4]" },
          { label: "Medical Rep",    value: fmt(repTotal),  color: "#f59e0b", text: "text-amber-600" },
          { label: "Doctor",         value: fmt(drTotal),   color: "#8b5cf6", text: "text-violet-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <AllWithdrawalsTable entries={entries} repMap={repMap} drMap={drMap} />
    </div>
  );
}
