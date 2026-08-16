import { requireAdmin }     from "@/lib/auth/dal";
import { prisma }           from "@/lib/db/prisma";
import { PageHeader }       from "@/components/admin/page-header";
import { CommissionPayoutClient } from "@/components/admin/commission-payout-client";

export const metadata = { title: "Commission Payout – Pronuvia Admin" };

export default async function CommissionPayoutPage() {
  await requireAdmin();

  // ── Current month bounds ──────────────────────────────────────────────────
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Fetch everything in parallel ──────────────────────────────────────────
  const [
    pendingWithdrawals,
    rejectedWithdrawals,
    currentMonthRepOrders,
    currentMonthDocOrders,
  ] = await Promise.all([
    // PENDING payout requests (previous months)
    prisma.withdrawRequest.findMany({
      where:   { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, userId: true, userRole: true, amount: true, note: true, createdAt: true },
    }),
    // REJECTED payout requests
    prisma.withdrawRequest.findMany({
      where:   { status: "REJECTED" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, userId: true, userRole: true, amount: true, note: true, adminNote: true, createdAt: true },
    }),
    // Current month orders for sales reps with commission
    prisma.order.findMany({
      where: {
        createdAt:               { gte: monthStart, lte: monthEnd },
        salesRepId:              { not: null },
        salesRepCommissionAmount: { gt: 0 },
        status:                  { notIn: ["REFUNDED", "CANCELLED"] },
      },
      select: {
        salesRepId: true, orderNumber: true, createdAt: true,
        salesRepCommissionAmount: true, salesRepCommissionRate: true,
      },
    }),
    // Current month orders for physicians with commission
    prisma.order.findMany({
      where: {
        createdAt:                 { gte: monthStart, lte: monthEnd },
        physicianId:               { not: null },
        physicianCommissionAmount: { gt: 0 },
        status:                    { notIn: ["REFUNDED", "CANCELLED"] },
      },
      select: {
        physicianId: true, orderNumber: true, createdAt: true,
        physicianCommissionAmount: true, physicianCommissionRate: true,
      },
    }),
  ]);

  // ── Collect all user IDs ──────────────────────────────────────────────────
  const withdrawRepIds = [...new Set([
    ...pendingWithdrawals.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId),
    ...rejectedWithdrawals.filter((r) => r.userRole === "SALES_REP").map((r) => r.userId),
  ])];
  const withdrawDocIds = [...new Set([
    ...pendingWithdrawals.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId),
    ...rejectedWithdrawals.filter((r) => r.userRole === "PHYSICIAN").map((r) => r.userId),
  ])];

  const currentRepIds = [...new Set(currentMonthRepOrders.map((o) => o.salesRepId!))];
  const currentDocIds = [...new Set(currentMonthDocOrders.map((o) => o.physicianId!))];

  const allRepIds = [...new Set([...withdrawRepIds, ...currentRepIds])];
  const allDocIds = [...new Set([...withdrawDocIds, ...currentDocIds])];

  // ── Fetch user info + commission-paid orders for payout modals ─────────────
  const [reps, physicians, repCommOrders, docCommOrders] = await Promise.all([
    allRepIds.length
      ? prisma.salesRepresentative.findMany({
          where:  { id: { in: allRepIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
    allDocIds.length
      ? prisma.partneringPhysician.findMany({
          where:  { id: { in: allDocIds } },
          select: { id: true, firstName: true, lastName: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
        })
      : [],
    // Commission-paid orders for payout modal (Show Orders)
    withdrawRepIds.length
      ? prisma.order.findMany({
          where:   { salesRepId: { in: withdrawRepIds }, commissionPaid: true },
          select:  { salesRepId: true, orderNumber: true, createdAt: true, salesRepCommissionAmount: true, salesRepCommissionRate: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
    withdrawDocIds.length
      ? prisma.order.findMany({
          where:   { physicianId: { in: withdrawDocIds }, commissionPaid: true },
          select:  { physicianId: true, orderNumber: true, createdAt: true, physicianCommissionAmount: true, physicianCommissionRate: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const repMap = new Map(reps.map((r) => [r.id, r]));
  const docMap = new Map(physicians.map((p) => [p.id, p]));

  // ── Build commission-paid order maps for payout modal ────────────────────
  type OrderRow = { orderNumber: string; createdAt: string; amount: number; rate: number };
  const repOrderMap = new Map<string, OrderRow[]>();
  const docOrderMap = new Map<string, OrderRow[]>();

  for (const o of repCommOrders) {
    const id = o.salesRepId!;
    const arr = repOrderMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.salesRepCommissionAmount ?? 0, rate: o.salesRepCommissionRate ?? 0 });
    repOrderMap.set(id, arr);
  }
  for (const o of docCommOrders) {
    const id = o.physicianId!;
    const arr = docOrderMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.physicianCommissionAmount ?? 0, rate: o.physicianCommissionRate ?? 0 });
    docOrderMap.set(id, arr);
  }

  // ── Build PENDING PAYOUT rows (previous months) ───────────────────────────
  type UserInfo = { firstName: string; lastName: string; email: string; bankName: string | null; bankAccountNumber: string | null; bankAccountName: string | null };

  const pending = pendingWithdrawals.flatMap((r) => {
    const user = r.userRole === "PHYSICIAN" ? docMap.get(r.userId) : repMap.get(r.userId);
    if (!user) return [];
    const orders = r.userRole === "PHYSICIAN" ? (docOrderMap.get(r.userId) ?? []) : (repOrderMap.get(r.userId) ?? []);
    return [{
      id: r.id, userId: r.userId, userRole: r.userRole as "PHYSICIAN" | "SALES_REP",
      amount: r.amount, note: r.note, createdAt: r.createdAt.toISOString(),
      user: user as UserInfo, orders,
    }];
  });

  const rejected = rejectedWithdrawals.flatMap((r) => {
    const user = r.userRole === "PHYSICIAN" ? docMap.get(r.userId) : repMap.get(r.userId);
    if (!user) return [];
    return [{
      id: r.id, userId: r.userId, userRole: r.userRole as "PHYSICIAN" | "SALES_REP",
      amount: r.amount, note: r.note, adminNote: r.adminNote, createdAt: r.createdAt.toISOString(),
      user: user as UserInfo,
    }];
  });

  // ── Build CURRENT MONTH commission rows ───────────────────────────────────
  type CurrentMonthOrder = { orderNumber: string; createdAt: string; amount: number; rate: number };
  type CurrentMonthEntry = {
    userId:          string;
    userRole:        "PHYSICIAN" | "SALES_REP";
    userName:        string;
    userEmail:       string;
    orderCount:      number;
    totalCommission: number;
    orders:          CurrentMonthOrder[];
  };

  // Group rep orders by userId
  const repCurrentMap = new Map<string, CurrentMonthOrder[]>();
  for (const o of currentMonthRepOrders) {
    const id = o.salesRepId!;
    const arr = repCurrentMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.salesRepCommissionAmount ?? 0, rate: o.salesRepCommissionRate ?? 0 });
    repCurrentMap.set(id, arr);
  }
  // Group doc orders by userId
  const docCurrentMap = new Map<string, CurrentMonthOrder[]>();
  for (const o of currentMonthDocOrders) {
    const id = o.physicianId!;
    const arr = docCurrentMap.get(id) ?? [];
    arr.push({ orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), amount: o.physicianCommissionAmount ?? 0, rate: o.physicianCommissionRate ?? 0 });
    docCurrentMap.set(id, arr);
  }

  const currentMonth: CurrentMonthEntry[] = [
    ...[...repCurrentMap.entries()].map(([id, orders]) => {
      const user = repMap.get(id);
      return {
        userId:          id,
        userRole:        "SALES_REP" as const,
        userName:        user ? `${user.firstName} ${user.lastName}` : "Unknown",
        userEmail:       user?.email ?? "",
        orderCount:      orders.length,
        totalCommission: parseFloat(orders.reduce((s, o) => s + o.amount, 0).toFixed(2)),
        orders,
      };
    }),
    ...[...docCurrentMap.entries()].map(([id, orders]) => {
      const user = docMap.get(id);
      return {
        userId:          id,
        userRole:        "PHYSICIAN" as const,
        userName:        user ? `${user.firstName} ${user.lastName}` : "Unknown",
        userEmail:       user?.email ?? "",
        orderCount:      orders.length,
        totalCommission: parseFloat(orders.reduce((s, o) => s + o.amount, 0).toFixed(2)),
        orders,
      };
    }),
  ].sort((a, b) => b.totalCommission - a.totalCommission);

  return (
    <div>
      <PageHeader
        title="Commission Payout"
        description="Review and approve monthly commission payouts for Medical Reps and Doctors"
      />
      <CommissionPayoutClient
        pending={pending}
        rejected={rejected}
        currentMonth={currentMonth}
        monthLabel={monthLabel}
      />
    </div>
  );
}
