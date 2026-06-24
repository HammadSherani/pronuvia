import type { ShipAddress, PackageInfo, RateResult, LabelResult } from "./types";

const BASE = "https://api.usps.com";

async function getToken(scope: string): Promise<string> {
  const res = await fetch(`${BASE}/oauth2/v3/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     process.env.USPS_CLIENT_ID     ?? "",
      client_secret: process.env.USPS_CLIENT_SECRET ?? "",
      scope,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`USPS auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

const MAIL_CLASSES = [
  { code: "PRIORITY_MAIL",         label: "USPS Priority Mail" },
  { code: "PRIORITY_MAIL_EXPRESS", label: "USPS Priority Mail Express" },
  { code: "GROUND_ADVANTAGE",      label: "USPS Ground Advantage" },
  { code: "PARCEL_SELECT",         label: "USPS Parcel Select" },
];

export async function getUSPSRates(
  from: ShipAddress,
  to:   ShipAddress,
  pkg:  PackageInfo
): Promise<RateResult[]> {
  const token = await getToken("prices.read");

  const weightOz = Math.round(pkg.weightLbs * 16 * 10) / 10;

  const requests = MAIL_CLASSES.map(async ({ code, label }) => {
    try {
      const res = await fetch(`${BASE}/prices/v3/total-rates/search`, {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originZIPCode:      from.zip,
          destinationZIPCode: to.zip,
          weight:             weightOz,
          length:             pkg.lengthIn  ?? 6,
          width:              pkg.widthIn   ?? 4,
          height:             pkg.heightIn  ?? 2,
          mailClass:          code,
          processingCategory: "MACHINABLE",
          destinationEntryFacilityType: "NONE",
          rateIndicator:      "DR",
          priceType:          "RETAIL",
          extraServices:      [],
        }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      const total = data?.totalBasePrice ?? data?.price ?? 0;
      return {
        carrier:      "usps",
        carrierLabel: "USPS",
        service:      label,
        serviceCode:  code,
        totalCost:    parseFloat(String(total)),
        currency:     "USD",
      } satisfies RateResult;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(requests);
  return results.filter((r): r is RateResult => r !== null);
}

export async function purchaseUSPSLabel(
  from:        ShipAddress,
  to:          ShipAddress,
  pkg:         PackageInfo,
  serviceCode: string,
  service:     string
): Promise<LabelResult> {
  const token = await getToken("labels");

  const weightOz = Math.round(pkg.weightLbs * 16 * 10) / 10;

  const body = {
    toAddress: {
      firstName:     to.name.split(" ")[0] ?? to.name,
      lastName:      to.name.split(" ").slice(1).join(" ") || " ",
      firm:          to.company ?? undefined,
      streetAddress: to.street1,
      secondaryAddress: to.street2 ?? undefined,
      city:          to.city,
      state:         to.state,
      ZIPCode:       to.zip.slice(0, 5),
    },
    fromAddress: {
      firstName:     from.name.split(" ")[0] ?? from.name,
      lastName:      from.name.split(" ").slice(1).join(" ") || " ",
      firm:          from.company ?? undefined,
      streetAddress: from.street1,
      city:          from.city,
      state:         from.state,
      ZIPCode:       from.zip.slice(0, 5),
      phone:         from.phone ?? undefined,
    },
    packageDescription: {
      mailClass:          serviceCode,
      processingCategory: "MACHINABLE",
      rateIndicator:      "DR",
      destinationEntryFacilityType: "NONE",
      weight:       { value: weightOz, unitOfMeasurement: "OZ" },
      dimensions: {
        length:            pkg.lengthIn  ?? 6,
        width:             pkg.widthIn   ?? 4,
        height:            pkg.heightIn  ?? 2,
        unitOfMeasurement: "IN",
      },
      extraServices: [],
    },
    imageInfo: {
      imageType: "PDF",
      labelType: "4X6LABEL",
    },
  };

  const res = await fetch(`${BASE}/labels/v3/label`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`USPS label error: ${err}`);
  }

  const data     = await res.json();
  const label64  = data?.labelImage ?? data?.PDFImage ?? "";
  const tracking = data?.trackingNumber ?? "";
  const cost     = parseFloat(String(data?.postage ?? data?.fees?.[0]?.price ?? 0));

  return {
    carrier:        "usps",
    carrierLabel:   "USPS",
    service,
    serviceCode,
    trackingNumber: tracking,
    labelBase64:    label64,
    labelFormat:    "PDF",
    cost,
    currency:       "USD",
  };
}
