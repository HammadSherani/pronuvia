import { NextResponse } from "next/server";
import { getUPSRates } from "@/lib/shipping/ups";
import type { ShipAddress, PackageInfo } from "@/lib/shipping/types";

export async function GET() {
  const from: ShipAddress = {
    name:    process.env.SHIP_FROM_NAME    ?? "Pronuvia",
    company: process.env.SHIP_FROM_COMPANY ?? "Pronuvia LLC",
    street1: process.env.SHIP_FROM_STREET  ?? "3609 165TH ST",
    city:    process.env.SHIP_FROM_CITY    ?? "Flushing",
    state:   process.env.SHIP_FROM_STATE   ?? "NY",
    zip:     process.env.SHIP_FROM_ZIP     ?? "11358",
    country: "US",
    phone:   process.env.SHIP_FROM_PHONE   ?? "2125550100",
  };

  const to: ShipAddress = {
    name:    "Test Customer",
    street1: "1600 Amphitheatre Pkwy",
    city:    "Mountain View",
    state:   "CA",
    zip:     "94043",
    country: "US",
  };

  const pkg: PackageInfo = { weightLbs: 2, lengthIn: 10, widthIn: 8, heightIn: 4 };

  try {
    const rates = await getUPSRates(from, to, pkg);
    return NextResponse.json({ success: true, rates, count: rates.length });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
