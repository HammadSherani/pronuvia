import { NextResponse } from "next/server";

const BASE = process.env.USPS_BASE_URL ?? "https://apis-sandbox.usps.com";

async function post(url: string, headers: Record<string, string>, body: string) {
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    return { status: res.status, text };
  } catch (e) {
    return { status: 0, text: `NETWORK_ERROR: ${(e as Error).message}` };
  }
}

export async function GET() {
  const clientId     = process.env.USPS_CLIENT_ID     ?? "";
  const clientSecret = process.env.USPS_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing USPS credentials" }, { status: 500 });
  }

  const tokenUrl = `${BASE}/oauth2/v3/token`;

  const tokenB = await post(
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
  );

  let ratesResult: unknown = "no token";
  if (tokenB.status === 200) {
    try {
      const token = (JSON.parse(tokenB.text) as { access_token: string }).access_token;
      const rates = await post(
        `${BASE}/prices/v3/total-rates/search`,
        { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        JSON.stringify({
          originZIPCode: "11358", destinationZIPCode: "94043",
          weight: 32, length: 10, width: 8, height: 4,
          mailClass: "PRIORITY_MAIL", processingCategory: "MACHINABLE",
          destinationEntryFacilityType: "NONE", rateIndicator: "DR",
          priceType: "RETAIL", extraServices: [],
        })
      );
      ratesResult = rates;
    } catch (e) {
      ratesResult = `PARSE_ERROR: ${(e as Error).message}`;
    }
  }

  return NextResponse.json({ base: BASE, tokenB, ratesResult });
}
