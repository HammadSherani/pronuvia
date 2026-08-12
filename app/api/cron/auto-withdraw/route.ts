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

  // Find any that already have a PENDING withdrawal — store IDs so we can update amounts
  const pendingRequests = await prisma.withdrawRequest.findMany({
    where: {
      status: "PENDING",
      OR: [
        { userRole: "SALES_REP", userId: { in: repIds } },
        { userRole: "PHYSICIAN", userId: { in: docIds } },
      ],
    },
    select: { id: true, userId: true, userRole: true },
  });

  // "ROLE:userId" → existing request id
  const pendingMap = new Map(pendingRequests.map((r) => [`${r.userRole}:${r.userId}`, r.id]));

  const toCreate: {
    userId:   string;
    userRole: "SALES_REP" | "PHYSICIAN";
    amount:   number;
    note:     string;
  }[] = [];
  const updateOps: Promise<unknown>[] = [];

  for (const rep of salesReps) {
    const existingId = pendingMap.get(`SALES_REP:${rep.id}`);
    if (existingId) {
      console.log(`[auto-withdraw] UPDATE sales rep ${rep.id} – balance $${rep.walletBalance.toFixed(2)}`);
      updateOps.push(
        prisma.withdrawRequest.update({ where: { id: existingId }, data: { amount: rep.walletBalance, note: autoNote } })
      );
    } else {
      console.log(`[auto-withdraw] CREATE sales rep ${rep.id} – balance $${rep.walletBalance.toFixed(2)}`);
      toCreate.push({ userId: rep.id, userRole: "SALES_REP", amount: rep.walletBalance, note: autoNote });
    }
  }

  for (const doc of physicians) {
    const existingId = pendingMap.get(`PHYSICIAN:${doc.id}`);
    if (existingId) {
      console.log(`[auto-withdraw] UPDATE physician ${doc.id} – balance $${doc.walletBalance.toFixed(2)}`);
      updateOps.push(
        prisma.withdrawRequest.update({ where: { id: existingId }, data: { amount: doc.walletBalance, note: autoNote } })
      );
    } else {
      console.log(`[auto-withdraw] CREATE physician ${doc.id} – balance $${doc.walletBalance.toFixed(2)}`);
      toCreate.push({ userId: doc.id, userRole: "PHYSICIAN", amount: doc.walletBalance, note: autoNote });
    }
  }

  await Promise.all(updateOps);
  if (toCreate.length > 0) await prisma.withdrawRequest.createMany({ data: toCreate });

  const updated = updateOps.length;
  const created = toCreate.length;

  if (updated === 0 && created === 0) {
    console.log("[auto-withdraw] cron completed – no eligible users");
    return NextResponse.json({ success: true, updated: 0, created: 0, message: "No eligible users." });
  }

  console.log(`[auto-withdraw] cron completed – ${created} created, ${updated} updated for ${monthLabel}`);
  return NextResponse.json({
    success: true,
    created,
    updated,
    message: `${created} created, ${updated} updated for ${monthLabel}.`,
  });
}
