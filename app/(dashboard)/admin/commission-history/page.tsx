import { requireAdmin }          from "@/lib/auth/dal";
import { prisma }               from "@/lib/db/prisma";
import { PageHeader }           from "@/components/admin/page-header";
import { CommissionHistoryClient } from "@/components/admin/commission-history-client";

export const metadata = { title: "Commission History – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parsePeriod(note: string | null, createdAt: Date): string {
  if (note) {
    const match = note.match(/Auto withdrawal\s*[–-]\s*(.+)/i);
    if (match) return match[1].trim();
  }
  return createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthKeyFromLabel(period: string, fallback: Date): string {
  const match = period.match(/([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const month = match[1];
    const year = match[2];
    const date = new Date(`${month} 1, ${year}`);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CommissionHistoryPage() {
  await requireAdmin();

  // Only APPROVED requests — these are completed payouts
  const approved = await prisma.withdrawRequest.findMany({
    where:   { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select:  { id: true, userId: true, userRole: true, amount: true, note: true, adminNote: true, createdAt: true },
  });

  const repIds = [...new Set(approved.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId))];
  const docIds = [...new Set(approved.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId))];

  const [reps, physicians] = await Promise.all([
    repIds.length
      ? prisma.salesRepresentative.findMany({
          where:  { id: { in: repIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
    docIds.length
      ? prisma.partneringPhysician.findMany({
          where:  { id: { in: docIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
  ]);

  const repMap = new Map(reps.map((r) => [r.id, r]));
  const docMap = new Map(physicians.map((p) => [p.id, p]));

  const [repOrders, docOrders] = await Promise.all([
    repIds.length
      ? prisma.order.findMany({
          where:   { salesRepId: { in: repIds }, commissionPaid: true },
          select:  { salesRepId: true, orderNumber: true, createdAt: true, salesRepCommissionAmount: true, salesRepCommissionRate: true },
          orderBy: { createdAt: "asc" },
        })
      : [],
    docIds.length
      ? prisma.order.findMany({
          where:   { physicianId: { in: docIds }, commissionPaid: true },
          select:  { physicianId: true, orderNumber: true, createdAt: true, physicianCommissionAmount: true, physicianCommissionRate: true },
          orderBy: { createdAt: "asc" },
        })
      : [],
  ]);

  type OrderRow = { orderNumber: string; createdAt: string; amount: number; rate: number };

  const repOrderMap = new Map<string, OrderRow[]>();
  const docOrderMap = new Map<string, OrderRow[]>();

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

  const grouped = new Map<string, {
    id: string;
    userRole: "PHYSICIAN" | "SALES_REP";
    userId: string;
    amount: number;
    note: string | null;
    adminNote: string | null;
    createdAt: string;
    user: { firstName: string; lastName: string; email: string };
    orders: OrderRow[];
    period: string;
  }>();

  for (const request of approved) {
    const user = request.userRole === "PHYSICIAN" ? docMap.get(request.userId) : repMap.get(request.userId);
    if (!user) continue;

    const createdAt = new Date(request.createdAt);
    const period = parsePeriod(request.note, createdAt);
    const monthKey = monthKeyFromLabel(period, createdAt);
    const key = `${request.userRole}:${request.userId}:${monthKey}`;

    const current = grouped.get(key) ?? {
      id: request.id,
      userRole: request.userRole as "PHYSICIAN" | "SALES_REP",
      userId: request.userId,
      amount: 0,
      note: request.note,
      adminNote: request.adminNote,
      createdAt: request.createdAt.toISOString(),
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      orders: [],
      period,
    };

    current.amount += Number(request.amount || 0);
    current.createdAt = new Date(request.createdAt).getTime() > new Date(current.createdAt).getTime()
      ? request.createdAt.toISOString()
      : current.createdAt;

    const allOrders = request.userRole === "PHYSICIAN" ? (docOrderMap.get(request.userId) ?? []) : (repOrderMap.get(request.userId) ?? []);
    const filteredOrders = allOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
      return periodKey === monthKey;
    });

    current.orders = [...new Map([...current.orders, ...filteredOrders].map((order) => [order.orderNumber, order])).values()];
    grouped.set(key, current);
  }

  const rows = [...grouped.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalPaid    = rows.reduce((s, r) => s + r.amount, 0);
  const repTotal     = rows.filter((r) => r.userRole === "SALES_REP").reduce((s, r) => s + r.amount, 0);
  const doctorTotal  = rows.filter((r) => r.userRole === "PHYSICIAN").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Commission History"
        description="Record of all approved commission payouts"
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Total Paid Out",  value: fmt(totalPaid),   color: "#3DBFA4", text: "text-[#3DBFA4]" },
          { label: "Medical Rep",     value: fmt(repTotal),    color: "#f59e0b", text: "text-amber-600" },
          { label: "Doctor",          value: fmt(doctorTotal), color: "#8b5cf6", text: "text-violet-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <CommissionHistoryClient rows={rows} />
    </div>
  );
}
