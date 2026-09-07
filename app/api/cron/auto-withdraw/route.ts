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
import { sweepCommissionPeriod } from "@/lib/withdrawals/commission-sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // vercel.json fires this every hour (not once daily) because PAYOUT_TIMEZONE
  // is a DST-observing zone (America/New_York) — its UTC offset changes twice
  // a year, so no single fixed daily UTC cron time stays aligned with local
  // 00:01 year-round. Firing hourly and gating on the timezone-aware local
  // clock below (correct across EST/EDT) still runs the sweep exactly once
  // per month, whichever UTC hour that local midnight falls on.
  const now = new Date();
  const payoutTimeZone = process.env.PAYOUT_TIMEZONE ?? "UTC";
  const clock = getPayoutLocalDateParts(now, payoutTimeZone);
  // PAYOUT_TEST_DAY lets the monthly gate be pointed at a specific day-of-month
  // temporarily (e.g. "8") to confirm the cron actually fires unattended at
  // the configured local time, without touching the permanent rule below.
  // Unset (the normal/permanent state) → always day 1.
  const testDay = Number(process.env.PAYOUT_TEST_DAY);
  const targetDay = Number.isInteger(testDay) && testDay >= 1 && testDay <= 31 ? testDay : 1;
  if (clock.day !== targetDay || clock.hour !== 0 || clock.minute !== 1) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Outside configured monthly payout time",
      timeZone: payoutTimeZone,
    });
  }
  const period = getPreviousMonthPayoutPeriod(now, payoutTimeZone);

  console.log(`[auto-withdraw] cron started – ${now.toISOString()}`);

  // Credit every order placed in the closing period to its owner's wallet
  // first — commission belongs to the order's month, not to whenever an
  // admin happened to mark it COMPLETED. Must run before the eligibility
  // query below so a just-swept balance is immediately payout-eligible.
  const sweep = await sweepCommissionPeriod(period);
  console.log("[auto-withdraw] commission sweep", sweep);

  // Note: no bank-details filter here — an account without bank details on
  // file still needs a payout request created so it's visible to the admin
  // (with a "bank details missing" warning in the UI). Approval itself
  // still hard-blocks paying out without bank details (manage-withdrawals.ts).
  const [salesReps, physicians] = await Promise.all([
    prisma.salesRepresentative.findMany({
      where: { walletBalance: { gt: 0 } },
      select: { id: true, walletBalance: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
    }),
    prisma.partneringPhysician.findMany({
      where: {
        isApproved: "APPROVED",
        walletBalance: { gt: 0 },
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
    return NextResponse.json({ success: true, period: period.label, sweep, created: 0, updated: 0, removed: 0 });
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
    sweep,
    created,
    updated: plan.update.length,
    removed: plan.remove.length,
    alreadyApproved: plan.skipApproved.length,
  };
  console.log("[auto-withdraw] completed", result);
  return NextResponse.json(result);
}
