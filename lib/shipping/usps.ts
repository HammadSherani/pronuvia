import type { ShipAddress, PackageInfo, RateResult, LabelResult } from "./types";

async function parseUSPSLabelResponse(res: Response): Promise<{ labelBase64: string; trackingNumber: string; cost: number }> {
  const contentType = res.headers.get("content-type") ?? "";
  console.log("[USPS label] response content-type:", contentType);

  if (contentType.includes("multipart")) {
    const boundary = (contentType.match(/boundary=["']?([^"';\s]+)["']?/) ?? [])[1] ?? "";
    const buf  = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("latin1"); // latin1 preserves bytes exactly

    console.log("[USPS multipart] boundary:", boundary);
    console.log("[USPS multipart] raw first 600 chars:", text.slice(0, 600));
    const parts = text.split(`--${boundary}`);
    let jsonData: Record<string, unknown> = {};
    let pdfContent = "";
    let pdfAlreadyBase64 = false;

    for (const part of parts) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const hdr  = part.slice(0, headerEnd).toLowerCase();
      const body = part.slice(headerEnd + 4);

      if (hdr.includes("application/json")) {
        try { jsonData = JSON.parse(body.trim()) as Record<string, unknown>; } catch { /* skip */ }
      } else if (hdr.includes("application/pdf")) {
        const raw = body.endsWith("\r\n") ? body.slice(0, -2) : body;
        const stripped = raw.trimStart();
        // USPS sends PDF as base64 text in multipart (name="labelImage") without
        // Content-Transfer-Encoding header. Detect by the universal base64-PDF prefix.
        pdfAlreadyBase64 = hdr.includes("content-transfer-encoding: base64")
          || stripped.startsWith("JVBERi0")
          || stripped.startsWith("JVBER");
        pdfContent = pdfAlreadyBase64
          ? raw.replace(/[\r\n\s]+/g, "") // strip whitespace from base64 text
          : raw;                            // keep binary as-is (latin1)
      }
    }

    const trackingNumber = String(jsonData.trackingNumber ?? "");
    const cost = parseFloat(String(jsonData.postage ?? (jsonData.fees as Array<{ price: number }>)?.[0]?.price ?? 0));
    let labelBase64 = String(jsonData.labelImage ?? jsonData.PDFImage ?? "");
    console.log("[USPS multipart] json keys:", Object.keys(jsonData).join(", "));
    console.log("[USPS multipart] labelImage from json:", labelBase64.length, "chars | pdfContent:", pdfContent.length, "| pdfAlreadyBase64:", pdfAlreadyBase64);
    if (!labelBase64 && pdfContent) {
      labelBase64 = pdfAlreadyBase64
        ? pdfContent
        : Buffer.from(pdfContent, "latin1").toString("base64");
      console.log("[USPS multipart] final label base64 length:", labelBase64.length, "| first20:", labelBase64.slice(0, 20));
    }
    return { labelBase64, trackingNumber, cost };
  }

  // JSON response
  const data = await res.json() as Record<string, unknown>;
  return {
    labelBase64:    String(data?.labelImage ?? data?.PDFImage ?? ""),
    trackingNumber: String(data?.trackingNumber ?? ""),
    cost:           parseFloat(String(data?.postage ?? (data?.fees as Array<{ price: number }>)?.[0]?.price ?? 0)),
  };
}

const BASE = process.env.USPS_BASE_URL ?? "https://api.usps.com";

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE}/oauth2/v3/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     process.env.USPS_CLIENT_ID     ?? "",
      client_secret: process.env.USPS_CLIENT_SECRET ?? "",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`USPS auth failed ${res.status}: ${body}`);
  }
  const data = await res.json() as { access_token: string; scope?: string; api_products?: string };
  console.log("[USPS auth] scope:", data.scope, "| products:", data.api_products);
  return data.access_token;
}

const MAIL_CLASSES = [
  { code: "USPS_GROUND_ADVANTAGE", label: "USPS Ground Advantage" },
  { code: "PRIORITY_MAIL",         label: "USPS Priority Mail" },
  { code: "PRIORITY_MAIL_EXPRESS", label: "USPS Priority Mail Express" },
];

type UspsRateOption = { totalBasePrice: number; rates: { productName?: string; description?: string }[] };

function pkgProcessingCategory(pkg: PackageInfo): string {
  const l = pkg.lengthIn ?? 6;
  const w = pkg.widthIn  ?? 4;
  const h = pkg.heightIn ?? 2;
  if (pkg.weightLbs > 25 || l > 34 || w > 17 || h > 17) return "IRREGULAR";
  return "MACHINABLE";
}

const USPS_FEATURES: Record<string, string[]> = {
  USPS_GROUND_ADVANTAGE: ["Tracking", "Insurance (up to $100.00)", "Free pickup"],
  PRIORITY_MAIL:         ["Tracking", "Insurance (up to $100.00)", "Free pickup"],
  PRIORITY_MAIL_EXPRESS: ["Tracking", "Insurance (up to $100.00)"],
};

const USPS_SIGNATURE_OPTIONS = [
  { code: 1, name: "Signature required",      price: 4.15 },
  { code: 2, name: "Adult signature required", price: 9.70 },
];

export async function getUSPSRates(
  from: ShipAddress,
  to:   ShipAddress,
  pkg:  PackageInfo,
): Promise<RateResult[]> {
  const token     = await getToken();
  const originZip = from.zip.slice(0, 5);
  const destZip   = to.zip.slice(0, 5);
  const procCat   = pkgProcessingCategory(pkg);
  // USPS Prices API v3 takes weight in POUNDS (integer, rounded up)
  const wLbs      = Math.max(1, Math.ceil(pkg.weightLbs));
  const lenIn     = Math.ceil(pkg.lengthIn ?? 6);
  const wdIn      = Math.ceil(pkg.widthIn  ?? 4);
  const htIn      = Math.ceil(pkg.heightIn ?? 2);

  console.log("[USPS rates] params:", { originZip, destZip, wLbs, lenIn, wdIn, htIn, procCat, base: BASE });

  const requests = MAIL_CLASSES.map(async ({ code, label }): Promise<RateResult | null> => {
    // For IRREGULAR packages, try IRREGULAR first; fall back to MACHINABLE
    const categories = procCat === "IRREGULAR" ? ["IRREGULAR", "MACHINABLE"] : ["MACHINABLE"];

    for (const cat of categories) {
      try {
        const reqBody: Record<string, unknown> = {
          originZIPCode:               originZip,
          destinationZIPCode:          destZip,
          weight:                      wLbs,
          length:                      lenIn,
          width:                       wdIn,
          height:                      htIn,
          mailClass:                   code,
          processingCategory:          cat,
          destinationEntryFacilityType:"NONE",
          rateIndicator:               "SP",
          priceType:                   "RETAIL",
        };

        const res = await fetch(`${BASE}/prices/v3/total-rates/search`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify(reqBody),
          cache:   "no-store",
        });

        if (!res.ok) {
          const err = await res.text();
          console.error(`USPS rate [${code}/${cat}] ${res.status}:`, err);
          continue; // try next category
        }

        const data    = await res.json();
        const options: UspsRateOption[] = data?.rateOptions ?? [];
        if (!options.length) continue;

        const best  = options.reduce((a, b) => a.totalBasePrice <= b.totalBasePrice ? a : b);
        const total = best.totalBasePrice;
        if (!total) continue;

        const productName = best.rates?.[0]?.productName ?? best.rates?.[0]?.description ?? label;

        return {
          carrier:          "usps",
          carrierLabel:     "USPS",
          service:          productName,
          serviceCode:      code,
          totalCost:        parseFloat(String(total)),
          currency:         "USD",
          features:         USPS_FEATURES[code] ?? [],
          signatureOptions: USPS_SIGNATURE_OPTIONS,
        } satisfies RateResult;
      } catch (e) {
        console.error(`USPS rate [${code}/${cat}] exception:`, e);
      }
    }

    return null;
  });

  const results = await Promise.all(requests);
  return results.filter((r): r is RateResult => r !== null);
}

async function getPaymentToken(oauthToken: string): Promise<string> {
  const crid   = process.env.USPS_CRID           ?? "";
  const accNum = process.env.USPS_ACCOUNT_NUMBER ?? "";
  const mid    = process.env.USPS_MID            ?? "";

  const reqBody = {
    roles: [
      {
        roleName:    "LABEL_OWNER",
        CRID:        crid,
        MID:         mid,
        manifestMID: mid,
        accountType: "EPS",
        accountNumber: accNum,
      },
      {
        roleName:    "PAYER",
        CRID:        crid,
        accountType: "EPS",
        accountNumber: accNum,
      },
    ],
  };
  console.log("[USPS payment] request:", JSON.stringify(reqBody));

  const res = await fetch(`${BASE}/payments/v3/payment-authorization`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${oauthToken}`, "Content-Type": "application/json" },
    body:    JSON.stringify(reqBody),
    cache:   "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`USPS payment auth failed ${res.status}: ${err}`);
  }

  const data = await res.json() as { paymentAuthorizationToken?: string };
  if (!data.paymentAuthorizationToken) {
    throw new Error(`USPS payment auth: no token in response — ${JSON.stringify(data)}`);
  }
  return data.paymentAuthorizationToken;
}

export async function purchaseUSPSLabel(
  from:          ShipAddress,
  to:            ShipAddress,
  pkg:           PackageInfo,
  serviceCode:   string,
  service:       string,
  signatureCode = 0,
): Promise<LabelResult> {
  const token        = await getToken();
  const paymentToken = await getPaymentToken(token);

  const weightLbs = Math.max(1, Math.ceil(pkg.weightLbs));

  const toNameParts   = to.name.trim().split(/\s+/);
  const fromNameParts = from.name.trim().split(/\s+/);

  const body = {
    toAddress: {
      firstName:        toNameParts[0] || "Customer",
      lastName:         toNameParts.slice(1).join(" ") || "-",
      firm:             to.company ?? undefined,
      streetAddress:    to.street1,
      secondaryAddress: to.street2 ?? undefined,
      city:             to.city,
      state:            to.state,
      ZIPCode:          to.zip.slice(0, 5),
      ignoreBadAddress: true,
    },
    fromAddress: {
      firstName:     fromNameParts[0] || "Sender",
      lastName:      fromNameParts.slice(1).join(" ") || "-",
      firm:          from.company ?? undefined,
      streetAddress: from.street1,
      city:          from.city,
      state:         from.state,
      ZIPCode:       from.zip.slice(0, 5),
      phone:         from.phone ?? undefined,
    },
    packageDescription: {
      mailClass:                    serviceCode,
      processingCategory:           pkgProcessingCategory(pkg),
      rateIndicator:                "SP",
      destinationEntryFacilityType: "NONE",
      weight:                       weightLbs,
      length:                       Math.ceil(pkg.lengthIn ?? 6),
      width:                        Math.ceil(pkg.widthIn  ?? 4),
      height:                       Math.ceil(pkg.heightIn ?? 2),
      mailingDate:                  new Date().toISOString().split("T")[0],
      extraServices:                signatureCode === 1 ? [910] : signatureCode === 2 ? [911] : [],
    },
    imageInfo: {
      imageType: "PDF",
      labelType: "4X6LABEL",
    },
  };

  console.log("[USPS label] request body:", JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE}/labels/v3/label`, {
    method: "POST",
    headers: {
      Authorization:               `Bearer ${token}`,
      "X-Payment-Authorization-Token": paymentToken,
      "Content-Type":              "application/json",
      Accept:                      "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`USPS label error: ${err}`);
  }

  const { labelBase64: label64, trackingNumber: tracking, cost } = await parseUSPSLabelResponse(res);

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
