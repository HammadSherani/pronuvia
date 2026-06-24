import type { ShipAddress, PackageInfo, RateResult, LabelResult } from "./types";

const BASE = "https://onlinetools.ups.com";

async function getToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.UPS_CLIENT_ID ?? ""}:${process.env.UPS_CLIENT_SECRET ?? ""}`
  ).toString("base64");

  const res = await fetch(`${BASE}/security/v1/oauth/token`, {
    method:  "POST",
    headers: {
      Authorization:  `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`UPS auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

const UPS_SERVICES: Record<string, string> = {
  "03": "UPS Ground",
  "02": "UPS 2nd Day Air",
  "01": "UPS Next Day Air",
  "13": "UPS Next Day Air Saver",
  "14": "UPS Next Day Air Early",
  "59": "UPS 2nd Day Air A.M.",
};

function toUPSAddress(a: ShipAddress) {
  return {
    Name:            a.name,
    AttentionName:   a.company ?? a.name,
    Phone:           { Number: a.phone ?? "0000000000" },
    Address: {
      AddressLine:       [a.street1, ...(a.street2 ? [a.street2] : [])],
      City:              a.city,
      StateProvinceCode: a.state,
      PostalCode:        a.zip,
      CountryCode:       a.country,
    },
  };
}

export async function getUPSRates(
  from: ShipAddress,
  to:   ShipAddress,
  pkg:  PackageInfo
): Promise<RateResult[]> {
  const token = await getToken();

  const body = {
    RateRequest: {
      Request: { RequestOption: "Shop" },
      Shipment: {
        Shipper:    { ...toUPSAddress(from), ShipperNumber: process.env.UPS_ACCOUNT_NUMBER ?? "" },
        ShipTo:     toUPSAddress(to),
        ShipFrom:   toUPSAddress(from),
        Package: {
          PackagingType:  { Code: "02" },
          Dimensions: pkg.lengthIn ? {
            UnitOfMeasurement: { Code: "IN" },
            Length: String(Math.round(pkg.lengthIn)),
            Width:  String(Math.round(pkg.widthIn  ?? 1)),
            Height: String(Math.round(pkg.heightIn ?? 1)),
          } : undefined,
          PackageWeight: {
            UnitOfMeasurement: { Code: "LBS" },
            Weight: String(pkg.weightLbs),
          },
        },
      },
    },
  };

  const res = await fetch(`${BASE}/api/rating/v2/Shop`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      transId:        `rate-${Date.now()}`,
      transactionSrc: "pronuvia",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`UPS rates error: ${err}`);
  }

  const data   = await res.json();
  const rated  = data?.RateResponse?.RatedShipment ?? [];
  const arr    = Array.isArray(rated) ? rated : [rated];

  return arr.map((r: Record<string, unknown>) => {
    const svcCode  = (r.Service as Record<string, unknown>)?.Code as string;
    const totalAmt = (r.TotalCharges as Record<string, unknown>)?.MonetaryValue;
    return {
      carrier:      "ups",
      carrierLabel: "UPS",
      service:      UPS_SERVICES[svcCode] ?? `UPS Service ${svcCode}`,
      serviceCode:  svcCode,
      totalCost:    parseFloat(String(totalAmt ?? 0)),
      currency:     "USD",
      deliveryDays: (r.GuaranteedDelivery as Record<string, unknown>)?.BusinessDaysInTransit as number | undefined,
    } satisfies RateResult;
  });
}

export async function purchaseUPSLabel(
  from:        ShipAddress,
  to:          ShipAddress,
  pkg:         PackageInfo,
  serviceCode: string,
  service:     string
): Promise<LabelResult> {
  const token = await getToken();

  const body = {
    ShipmentRequest: {
      Request:  { RequestOption: "nonvalidate" },
      Shipment: {
        Description: "Pronuvia Order",
        Shipper:     { ...toUPSAddress(from), ShipperNumber: process.env.UPS_ACCOUNT_NUMBER ?? "" },
        ShipTo:      toUPSAddress(to),
        ShipFrom:    toUPSAddress(from),
        PaymentInformation: {
          ShipmentCharge: {
            Type: "01",
            BillShipper: { AccountNumber: process.env.UPS_ACCOUNT_NUMBER ?? "" },
          },
        },
        Service:  { Code: serviceCode },
        Package:  {
          PackagingType: { Code: "02" },
          Dimensions: pkg.lengthIn ? {
            UnitOfMeasurement: { Code: "IN" },
            Length: String(Math.round(pkg.lengthIn)),
            Width:  String(Math.round(pkg.widthIn  ?? 1)),
            Height: String(Math.round(pkg.heightIn ?? 1)),
          } : undefined,
          PackageWeight: {
            UnitOfMeasurement: { Code: "LBS" },
            Weight: String(pkg.weightLbs),
          },
        },
      },
      LabelSpecification: {
        LabelImageFormat:  { Code: "PNG" },
        HTTPUserAgent:     "Mozilla/5.0",
        LabelStockSize:    { Height: "6", Width: "4" },
      },
    },
  };

  const res = await fetch(`${BASE}/api/shipments/v1/ship`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      transId:        `ship-${Date.now()}`,
      transactionSrc: "pronuvia",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`UPS label error: ${err}`);
  }

  const data     = await res.json();
  const results  = data?.ShipmentResponse?.ShipmentResults;
  const pkg0     = results?.PackageResults;
  const pkgArr   = Array.isArray(pkg0) ? pkg0 : [pkg0];
  const label64  = pkgArr[0]?.ShippingLabel?.GraphicImage as string ?? "";
  const tracking = pkgArr[0]?.TrackingNumber as string ?? results?.ShipmentIdentificationNumber ?? "";
  const cost     = parseFloat(String((results?.ShipmentCharges?.TotalCharges?.MonetaryValue) ?? 0));

  return {
    carrier:        "ups",
    carrierLabel:   "UPS",
    service,
    serviceCode,
    trackingNumber: tracking,
    labelBase64:    label64,
    labelFormat:    "PNG",
    cost,
    currency:       "USD",
  };
}
