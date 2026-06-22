import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    env_vars: {
      DATABASE_URL:                    process.env.DATABASE_URL        ? `SET (${process.env.DATABASE_URL.slice(0, 20)}...)` : "❌ MISSING",
      SESSION_SECRET:                  process.env.SESSION_SECRET      ? "✅ SET" : "❌ MISSING",
      ADMIN_SETUP_TOKEN:               process.env.ADMIN_SETUP_TOKEN   ? "✅ SET" : "❌ MISSING",
      STRIPE_SECRET_KEY:               process.env.STRIPE_SECRET_KEY   ? "✅ SET" : "❌ MISSING",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "✅ SET" : "❌ MISSING",
    },
    database: "pending",
    database_error: null as string | null,
  };

  try {
    const adminCount = await prisma.admin.count();
    result.database = "✅ CONNECTED";
    result.admin_count = adminCount;
  } catch (err) {
    result.database = "❌ FAILED";
    result.database_error = err instanceof Error ? err.message : String(err);
    result.database_error_type = err instanceof Error ? err.constructor.name : typeof err;
  }

  return NextResponse.json(result, {
    status: result.database === "✅ CONNECTED" ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
