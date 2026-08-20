import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildMonthlyPayoutPlan,
  getPayoutLocalDateParts,
  getPreviousMonthPayoutPeriod,
  monthlyPayoutRequestId,
  type MonthlyPayoutRequest,
  type MonthlyPayoutUser,
} from "@/lib/withdrawals/monthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const payoutTimeZone = process.env.PAYOUT_TIMEZONE ?? "UTC";
  const clock = getPayoutLocalDateParts(now, payoutTimeZone);
  if (clock.day !== 1 || clock.hour !== 0 || clock.minute !== 1) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Outside configured monthly payout time",
      timeZone: payoutTimeZone,
    });
  }
  const period = getPreviousMonthPayoutPeriod(now, payoutTimeZone);

  console.log(`[auto-withdraw] cron started – ${now.toISOString()}`);

  const [salesReps, physicians] = await Promise.all([
    prisma.salesRepresentative.findMany({
      where: {
        walletBalance: { gt: 0 },
        bankName: { not: null },
        bankAccountNumber: { not: null },
        bankAccountName: { not: null },
      },
      select: { id: true, walletBalance: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
    }),
    prisma.partneringPhysician.findMany({
      where: {
        isApproved: "APPROVED",
        walletBalance: { gt: 0 },
        bankName: { not: null },
        bankAccountNumber: { not: null },
        bankAccountName: { not: null },
      },
      select: { id: true, walletBalance: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
    }),
  ]);

  const users: MonthlyPayoutUser[] = [
    ...salesReps.map((user) => ({
      id: user.id,
      userRole: "SALES_REP" as const,
      walletBalance: user.walletBalance,
      hasBankAccount: Boolean(user.bankName && user.bankAccountNumber && user.bankAccountName),
    })),
    ...physicians.map((user) => ({
      id: user.id,
      userRole: "PHYSICIAN" as const,
      walletBalance: user.walletBalance,
      hasBankAccount: Boolean(user.bankName && user.bankAccountNumber && user.bankAccountName),
    })),
  ];

  if (!users.length) {
    return NextResponse.json({ success: true, period: period.label, created: 0, updated: 0, removed: 0 });
  }

  const requests = await prisma.withdrawRequest.findMany({
    where: { OR: users.map((user) => ({ userId: user.id, userRole: user.userRole })) },
    select: {
      id: true, userId: true, userRole: true, amount: true, status: true, note: true,
      periodKey: true, snapshotAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const plan = buildMonthlyPayoutPlan({ users, requests: requests as MonthlyPayoutRequest[], period });

  if (plan.remove.length) {
    await prisma.withdrawRequest.deleteMany({ where: { id: { in: plan.remove } } });
  }
  if (plan.update.length) {
    await Promise.all(plan.update.map((item) => prisma.withdrawRequest.update({
      where: { id: item.id },
      data: { amount: item.amount, note: item.note },
    })));
  }
  let created = 0;
  for (const item of plan.create) {
    try {
      await prisma.withdrawRequest.create({
        data: {
          id: monthlyPayoutRequestId(item.userId, item.userRole, item.periodKey),
          ...item,
        },
      });
      created++;
    } catch (error) {
      // A concurrent cron invocation may have created the same deterministic
      // request. Treat that one race as success; surface all other failures.
      if ((error as { code?: string })?.code !== "P2002") throw error;
    }
  }

  const result = {
    success: true,
    period: period.label,
    created,
    updated: plan.update.length,
    removed: plan.remove.length,
    alreadyApproved: plan.skipApproved.length,
  };
  console.log("[auto-withdraw] completed", result);
  return NextResponse.json(result);
}
