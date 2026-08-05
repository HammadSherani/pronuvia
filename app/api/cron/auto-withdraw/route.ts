import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now        = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const autoNote   = `Auto withdrawal – ${monthLabel}`;

  console.log(`[auto-withdraw] cron started – ${now.toISOString()}`);

  // Fetch all users with positive balance and a bank account linked
  const [salesReps, physicians] = await Promise.all([
    prisma.salesRepresentative.findMany({
      where:  { walletBalance: { gt: 0 }, bankName: { not: null } },
      select: { id: true, walletBalance: true },
    }),
    prisma.partneringPhysician.findMany({
      where:  { walletBalance: { gt: 0 }, bankName: { not: null } },
      select: { id: true, walletBalance: true },
    }),
  ]);

  console.log(`[auto-withdraw] eligible – ${salesReps.length} sales rep(s), ${physicians.length} physician(s)`);

  const repIds = salesReps.map((r) => r.id);
  const docIds = physicians.map((d) => d.id);

  // Find any that already have a PENDING withdrawal (auto or manual — either blocks a new request)
  const pendingRequests = await prisma.withdrawRequest.findMany({
    where: {
      status: "PENDING",
      OR: [
        { userRole: "SALES_REP", userId: { in: repIds } },
        { userRole: "PHYSICIAN", userId: { in: docIds } },
      ],
    },
    select: { userId: true, userRole: true },
  });

  const hasPending = new Set(pendingRequests.map((r) => `${r.userRole}:${r.userId}`));

  const toCreate: {
    userId:   string;
    userRole: "SALES_REP" | "PHYSICIAN";
    amount:   number;
    note:     string;
  }[] = [];

  for (const rep of salesReps) {
    const key = `SALES_REP:${rep.id}`;
    if (hasPending.has(key)) {
      console.log(`[auto-withdraw] SKIP sales rep ${rep.id} – pending request exists`);
    } else {
      console.log(`[auto-withdraw] QUEUE sales rep ${rep.id} – balance $${rep.walletBalance.toFixed(2)}`);
      toCreate.push({ userId: rep.id, userRole: "SALES_REP", amount: rep.walletBalance, note: autoNote });
    }
  }

  for (const doc of physicians) {
    const key = `PHYSICIAN:${doc.id}`;
    if (hasPending.has(key)) {
      console.log(`[auto-withdraw] SKIP physician ${doc.id} – pending request exists`);
    } else {
      console.log(`[auto-withdraw] QUEUE physician ${doc.id} – balance $${doc.walletBalance.toFixed(2)}`);
      toCreate.push({ userId: doc.id, userRole: "PHYSICIAN", amount: doc.walletBalance, note: autoNote });
    }
  }

  if (toCreate.length === 0) {
    console.log("[auto-withdraw] cron completed – no new requests needed");
    return NextResponse.json({ success: true, created: 0, message: "No new withdrawal requests needed." });
  }

  await prisma.withdrawRequest.createMany({ data: toCreate });

  console.log(`[auto-withdraw] cron completed – created ${toCreate.length} request(s) for ${monthLabel}`);
  return NextResponse.json({
    success: true,
    created: toCreate.length,
    message: `Created ${toCreate.length} auto withdrawal request(s) for ${monthLabel}.`,
  });
}
