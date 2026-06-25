import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or manually with the secret)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now        = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const autoNote   = `Auto withdrawal – ${monthLabel}`;

  // Find sales reps with positive balance
  const [salesReps, physicians] = await Promise.all([
    prisma.salesRepresentative.findMany({
      where: { walletBalance: { gt: 0 } },
      select: { id: true, walletBalance: true },
    }),
    prisma.partneringPhysician.findMany({
      where: { walletBalance: { gt: 0 } },
      select: { id: true, walletBalance: true },
    }),
  ]);

  // Find users who already have an auto-request this month (avoid duplicates)
  const existingRequests = await prisma.withdrawRequest.findMany({
    where: {
      note:      autoNote,
      createdAt: { gte: monthStart, lt: monthEnd },
    },
    select: { userId: true, userRole: true },
  });

  const alreadyRequested = new Set(
    existingRequests.map((r) => `${r.userRole}:${r.userId}`),
  );

  const toCreate: {
    userId:   string;
    userRole: "SALES_REP" | "PHYSICIAN";
    amount:   number;
    note:     string;
  }[] = [];

  for (const rep of salesReps) {
    if (!alreadyRequested.has(`SALES_REP:${rep.id}`)) {
      toCreate.push({
        userId:   rep.id,
        userRole: "SALES_REP",
        amount:   rep.walletBalance,
        note:     autoNote,
      });
    }
  }

  for (const doc of physicians) {
    if (!alreadyRequested.has(`PHYSICIAN:${doc.id}`)) {
      toCreate.push({
        userId:   doc.id,
        userRole: "PHYSICIAN",
        amount:   doc.walletBalance,
        note:     autoNote,
      });
    }
  }

  if (toCreate.length === 0) {
    return NextResponse.json({
      success: true,
      created: 0,
      message: "No new withdrawal requests needed.",
    });
  }

  await prisma.withdrawRequest.createMany({ data: toCreate });

  return NextResponse.json({
    success: true,
    created: toCreate.length,
    message: `Created ${toCreate.length} auto withdrawal request(s) for ${monthLabel}.`,
  });
}
