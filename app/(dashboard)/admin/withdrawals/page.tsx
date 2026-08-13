import { requireAdmin }     from "@/lib/auth/dal";
import { prisma }           from "@/lib/db/prisma";
import { PageHeader }       from "@/components/admin/page-header";
import { CommissionPayoutClient } from "@/components/admin/commission-payout-client";

export const metadata = { title: "Commission Payout – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function CommissionPayoutPage() {
  await requireAdmin();

  // Fetch pending + rejected requests only (approved are done — they disappear)
  const [pendingRaw, rejectedRaw] = await Promise.all([
    prisma.withdrawRequest.findMany({
      where:   { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, userId: true, userRole: true, amount: true, note: true, createdAt: true },
    }),
    prisma.withdrawRequest.findMany({
      where:   { status: "REJECTED" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, userId: true, userRole: true, amount: true, note: true, adminNote: true, createdAt: true },
    }),
  ]);

  // Collect user IDs by role
  const repIds = [...new Set([
    ...pendingRaw.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId),
    ...rejectedRaw.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId),
  ])];
  const docIds = [...new Set([
    ...pendingRaw.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId),
    ...rejectedRaw.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId),
  ])];

  const [reps, physicians] = await Promise.all([
    repIds.length
      ? prisma.salesRepresentative.findMany({
          where:  { id: { in: repIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
    docIds.length
      ? prisma.partneringPhysician.findMany({
          where:  { id: { in: docIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
  ]);

  const repMap = new Map(reps.map((r) => [r.id, r]));
  const docMap = new Map(physicians.map((p) => [p.id, p]));

  // Fetch commissionPaid orders for all relevant users (for Show Orders modal)
  const [repOrders, docOrders] = await Promise.all([
    repIds.length
      ? prisma.order.findMany({
          where:   { salesRepId: { in: repIds }, commissionPaid: true },
          select:  { salesRepId: true, orderNumber: true, createdAt: true, salesRepCommissionAmount: true, salesRepCommissionRate: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
    docIds.length
      ? prisma.order.findMany({
          where:   { physicianId: { in: docIds }, commissionPaid: true },
          select:  { physicianId: true, orderNumber: true, createdAt: true, physicianCommissionAmount: true, physicianCommissionRate: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  // Group orders by userId
  type OrderRow = { orderNumber: string; createdAt: string; amount: number; rate: number };
  const repOrderMap  = new Map<string, OrderRow[]>();
  const docOrderMap  = new Map<string, OrderRow[]>();

  for (const o of repOrders) {
    const id  = o.salesRepId!;
    const arr = repOrderMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.salesRepCommissionAmount ?? 0, rate: o.salesRepCommissionRate ?? 0 });
    repOrderMap.set(id, arr);
  }
  for (const o of docOrders) {
    const id  = o.physicianId!;
    const arr = docOrderMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.physicianCommissionAmount ?? 0, rate: o.physicianCommissionRate ?? 0 });
    docOrderMap.set(id, arr);
  }

  // Build typed rows
  type UserInfo = { firstName: string; lastName: string; email: string; bankName: string | null; bankAccountNumber: string | null; bankAccountName: string | null };

  const pending = pendingRaw.flatMap((r) => {
    const user = r.userRole === "PHYSICIAN" ? docMap.get(r.userId) : repMap.get(r.userId);
    if (!user) return [];
    const orders = r.userRole === "PHYSICIAN" ? (docOrderMap.get(r.userId) ?? []) : (repOrderMap.get(r.userId) ?? []);
    return [{
      id: r.id, userId: r.userId, userRole: r.userRole as "PHYSICIAN" | "SALES_REP",
      amount: r.amount, note: r.note, createdAt: r.createdAt.toISOString(),
      user: user as UserInfo, orders,
    }];
  });

  const rejected = rejectedRaw.flatMap((r) => {
    const user = r.userRole === "PHYSICIAN" ? docMap.get(r.userId) : repMap.get(r.userId);
    if (!user) return [];
    return [{
      id: r.id, userId: r.userId, userRole: r.userRole as "PHYSICIAN" | "SALES_REP",
      amount: r.amount, note: r.note, adminNote: r.adminNote, createdAt: r.createdAt.toISOString(),
      user: user as UserInfo,
    }];
  });

  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Commission Payout"
        description="Review and approve monthly commission payouts for Medical Reps and Doctors"
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: "Pending Payouts", value: pending.length.toString(),  sub: `Total ${fmt(pendingTotal)}`, color: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-600" },
          { label: "Total Pending",   value: fmt(pendingTotal),          sub: "Awaiting approval",           color: "#3DBFA4", bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Rejected",        value: rejected.length.toString(), sub: "Requests rejected",           color: "#ef4444", bg: "bg-red-50",     text: "text-red-500" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <CommissionPayoutClient pending={pending} rejected={rejected} />
    </div>
  );
}
