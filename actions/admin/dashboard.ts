"use server";

import { prisma } from "@/lib/db/prisma";

function buildBuckets(period: "daily" | "weekly" | "monthly", count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    if (period === "daily") {
      const d = new Date(now);
      d.setDate(d.getDate() - offset);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start.getTime() + 86_400_000);
      return { start, end, label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    } else if (period === "weekly") {
      const d = new Date(now);
      d.setDate(d.getDate() - offset * 7);
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 86_400_000);
      return { start, end, label: `Wk ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      return { start, end, label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
    }
  });
}

export async function getDashboardStats() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [
    salesRepsCount,
    physiciansCount,
    pendingWithdrawals,
    totals,
    recentOrders,
    latestOrders,
    latestPhysicians,
  ] = await Promise.all([
    prisma.salesRepresentative.count(),
    prisma.partneringPhysician.count({ where: { isApproved: "APPROVED" } }),
    prisma.withdrawRequest.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true }),
    prisma.order.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: {
        total: true,
        status: true,
        createdAt: true,
        salesRepCommissionAmount: true,
        physicianCommissionAmount: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        salesRep: { select: { firstName: true, lastName: true } },
        physician: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.partneringPhysician.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isApproved: true,
        createdAt: true,
      },
    }),
  ]);

  function buildChartData(period: "daily" | "weekly" | "monthly", count: number) {
    return buildBuckets(period, count).map(({ start, end, label }) => {
      const slice = recentOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      return {
        label,
        orders: slice.length,
        revenue: Math.round(slice.reduce((s, o) => s + o.total, 0) * 100) / 100,
      };
    });
  }

  const statusCounts = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalRepCommission = recentOrders.reduce((s, o) => s + o.salesRepCommissionAmount, 0);
  const totalDrCommission  = recentOrders.reduce((s, o) => s + o.physicianCommissionAmount, 0);

  const monthly = buildChartData("monthly", 12);
  const prevMonth = monthly[monthly.length - 2] ?? { orders: 0, revenue: 0 };
  const currMonth = monthly[monthly.length - 1] ?? { orders: 0, revenue: 0 };
  const ordersChange  = prevMonth.orders  > 0 ? Math.round(((currMonth.orders  - prevMonth.orders)  / prevMonth.orders)  * 100) : 0;
  const revenueChange = prevMonth.revenue > 0 ? Math.round(((currMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

  return {
    kpis: {
      salesRepsCount,
      physiciansCount,
      pendingWithdrawals,
      totalOrders:   totals._count,
      totalRevenue:  Math.round((totals._sum.total ?? 0) * 100) / 100,
      ordersChange,
      revenueChange,
    },
    charts: {
      statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      commissionBreakdown: [
        { name: "Sales Rep", value: Math.round(totalRepCommission * 100) / 100 },
        { name: "Physician", value: Math.round(totalDrCommission  * 100) / 100 },
      ],
      daily:   buildChartData("daily",   30),
      weekly:  buildChartData("weekly",  12),
      monthly,
    },
    latestOrders: latestOrders.map((o) => ({
      id:          o.id,
      orderNumber: o.orderNumber,
      total:       o.total,
      status:      o.status,
      createdAt:   o.createdAt,
      repName:     o.salesRep ? `${o.salesRep.firstName} ${o.salesRep.lastName}` : null,
      drName:      o.physician ? `${o.physician.firstName} ${o.physician.lastName}` : null,
    })),
    latestPhysicians: latestPhysicians.map((p) => ({
      id:         p.id,
      name:       `${p.firstName} ${p.lastName}`,
      email:      p.email,
      isApproved: p.isApproved,
      createdAt:  p.createdAt,
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
