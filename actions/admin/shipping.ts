"use server";

import { requireAdmin }          from "@/lib/auth/dal";
import { prisma }                from "@/lib/db/prisma";
import { revalidatePath }        from "next/cache";
import { getFedExRates, purchaseFedExLabel }   from "@/lib/shipping/fedex";
import { getUPSRates,   purchaseUPSLabel }     from "@/lib/shipping/ups";
import { getUSPSRates,  purchaseUSPSLabel }    from "@/lib/shipping/usps";
import type { CarrierCode, ShipAddress, PackageInfo, RateResult, LabelResult } from "@/lib/shipping/types";

function getFromAddress(): ShipAddress {
  return {
    name:    process.env.SHIP_FROM_NAME    ?? "Pronuvia",
    company: process.env.SHIP_FROM_COMPANY ?? "Pronuvia LLC",
    street1: process.env.SHIP_FROM_STREET  ?? "123 Warehouse Blvd",
    city:    process.env.SHIP_FROM_CITY    ?? "New York",
    state:   process.env.SHIP_FROM_STATE   ?? "NY",
    zip:     process.env.SHIP_FROM_ZIP     ?? "10001",
    country: "US",
    phone:   process.env.SHIP_FROM_PHONE   ?? "2125550100",
  };
}

// State name → 2-letter code (for legacy addresses stored without codes)
const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN",
  texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

function toStateCode(s: string): string {
  const trimmed = s.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return US_STATES[trimmed.toLowerCase()] ?? trimmed.toUpperCase().slice(0, 2);
}

function toCountryCode(s: string): string {
  const lower = s.trim().toLowerCase();
  if (/^[a-z]{2}$/i.test(lower)) return lower.toUpperCase();
  if (lower === "united states" || lower === "usa" || lower === "us") return "US";
  if (lower === "canada") return "CA";
  // fallback: first 2 letters (rare for non-US orders)
  return s.trim().toUpperCase().slice(0, 2) || "US";
}

function parseAddressString(raw: string): { street: string; city: string; state: string; zip: string; country: string } | null {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  // ── City + State + ZIP via regex (most reliable, works even with duplicate data) ──
  // Matches "Battle Ground, WA 98604" or "Battle Ground, WA, 98604"
  const csz = raw.match(/([A-Za-z][A-Za-z\s]{2,}?),\s*([A-Za-z]{2})[,\s]+(\d{5}(?:-\d{4})?)/);
  if (!csz) return null;
  const city  = csz[1].trim();
  const state = toStateCode(csz[2]);
  const zip   = csz[3];

  // ── Street: first line starting with a digit ────────────────────────────────
  const streetLine = lines.find(l => /^\d/.test(l));
  if (!streetLine) return null;
  const street = streetLine.split(",")[0].trim();

  // ── Country: last alphabetic-only line ──────────────────────────────────────
  const lastLine = lines[lines.length - 1] ?? "";
  const country = /^[A-Za-z\s]+$/.test(lastLine) ? toCountryCode(lastLine) : "US";

  console.log("[parseAddress] → street:", street, "| city:", city, "| state:", state, "| zip:", zip, "| country:", country);

  if (!street || !city || !zip) return null;
  return { street, city, state, zip, country };
}

async function buildToAddress(orderId: string): Promise<[ShipAddress, null] | [null, string]> {
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      shippingAddress: true,
      physician: {
        select: { firstName: true, lastName: true, phone: true },
      },
      salesRep: {
        select: { firstName: true, lastName: true, phone: true },
      },
    },
  });

  if (!order) return [null, "Order not found."];

  // ── Use order.shippingAddress (set at checkout) as primary source ─────────
  if (order.shippingAddress) {
    const parsed = parseAddressString(order.shippingAddress);
    if (parsed) {
      const ph  = order.physician;
      const rep = order.salesRep;
      const name = ph
        ? `Dr. ${ph.firstName} ${ph.lastName}`
        : rep ? `${rep.firstName ?? ""} ${rep.lastName ?? ""}`.trim() : "Recipient";
      const phone = ph?.phone ?? rep?.phone ?? undefined;

      return [{
        name,
        street1: parsed.street,
        city:    parsed.city,
        state:   parsed.state,
        zip:     parsed.zip,
        country: parsed.country,
        phone,
      }, null];
    }

    return [null, `Could not parse shipping address: "${order.shippingAddress}". Expected format: "123 Main St, City, ST 12345".`];
  }

  return [null, "No shipping address was saved on this order."];
}

export async function getOrderShipments(orderId: string) {
  await requireAdmin();
  return prisma.shipment.findMany({
    where:   { orderId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getShippingRates(
  orderId:  string,
  pkg:      PackageInfo,
  carriers: CarrierCode[],
  overrideAddress?: ShipAddress
): Promise<{ rates: RateResult[]; error?: string }> {
  await requireAdmin();

  const from = getFromAddress();
  let to: ShipAddress;
  if (overrideAddress) {
    to = overrideAddress;
  } else {
    const [toOrNull, toErr] = await buildToAddress(orderId);
    if (toErr || !toOrNull) return { rates: [], error: toErr ?? "Address unavailable." };
    to = toOrNull;
  }

  const tasks: Promise<RateResult[]>[] = [];

  if (carriers.includes("fedex") && process.env.FEDEX_CLIENT_ID) {
    tasks.push(getFedExRates(from, to, pkg).catch((e: Error) => {
      console.error("FedEx rates error:", e.message); return [];
    }));
  }
  if (carriers.includes("ups") && process.env.UPS_CLIENT_ID) {
    tasks.push(getUPSRates(from, to, pkg).catch((e: Error) => {
      console.error("UPS rates error:", e.message); return [];
    }));
  }
  if (carriers.includes("usps") && process.env.USPS_CLIENT_ID) {
    tasks.push(getUSPSRates(from, to, pkg).catch((e: Error) => {
      console.error("USPS rates error:", e.message); return [];
    }));
  }

  if (tasks.length === 0) {
    return { rates: [], error: "No carrier API credentials configured. Add FEDEX_CLIENT_ID, UPS_CLIENT_ID, or USPS_CLIENT_ID to .env" };
  }

  const results = await Promise.all(tasks);
  const rates   = results.flat().sort((a, b) => a.totalCost - b.totalCost);

  return { rates };
}

export async function purchaseLabel(
  orderId:     string,
  pkg:         PackageInfo,
  carrier:     CarrierCode,
  serviceCode: string,
  service:     string,
  overrideAddress?: ShipAddress
): Promise<{ success: boolean; message: string; shipment?: { trackingNumber: string; labelBase64: string; labelFormat: string; cost: number } }> {
  await requireAdmin();

  const from = getFromAddress();
  let to: ShipAddress;
  if (overrideAddress) {
    to = overrideAddress;
  } else {
    const [toOrNull2, toErr2] = await buildToAddress(orderId);
    if (toErr2 || !toOrNull2) return { success: false, message: toErr2 ?? "Address unavailable." };
    to = toOrNull2;
  }

  let result: LabelResult;

  try {
    if (carrier === "fedex") {
      result = await purchaseFedExLabel(from, to, pkg, serviceCode, service);
    } else if (carrier === "ups") {
      result = await purchaseUPSLabel(from, to, pkg, serviceCode, service);
    } else {
      result = await purchaseUSPSLabel(from, to, pkg, serviceCode, service);
    }
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }

  await prisma.shipment.create({
    data: {
      orderId,
      carrier:        result.carrier,
      carrierLabel:   result.carrierLabel,
      service:        result.service,
      serviceCode:    result.serviceCode,
      trackingNumber: result.trackingNumber,
      labelBase64:    result.labelBase64,
      labelFormat:    result.labelFormat,
      fromAddress:    from as object,
      toAddress:      to as object,
      weightLbs:      pkg.weightLbs,
      lengthIn:       pkg.lengthIn,
      widthIn:        pkg.widthIn,
      heightIn:       pkg.heightIn,
      cost:           result.cost,
      currency:       result.currency,
    },
  });

  // Get current order to check status and items before updating
  const currentOrder = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { status: true, items: true },
  });

  // Update order with latest tracking info
  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber:  result.trackingNumber,
      shippingCarrier: `${result.carrierLabel} - ${result.service}`,
      shippingRate:    result.cost,
      status:          "SHIPPED",
    },
  });

  // Decrease inventory only on FIRST shipment (when order wasn't already SHIPPED)
  if (currentOrder && currentOrder.status !== "SHIPPED") {
    type RawItem = { productId?: string; sku?: string; quantity?: number };
    const orderItems = currentOrder.items as RawItem[];

    await Promise.all(
      orderItems
        .filter(it => it.productId && it.quantity)
        .map(async it => {
          try {
            const product = await prisma.product.findUnique({ where: { id: it.productId! } });
            if (!product) return;

            type Variant = { sku?: string; stock?: number; [key: string]: unknown };
            const variants = (product.variants ?? []) as Variant[];

            // Find variant by SKU match
            const variantIdx = variants.findIndex(v => v.sku && it.sku && v.sku === it.sku);

            if (variantIdx !== -1) {
              // Decrement variant stock
              variants[variantIdx] = {
                ...variants[variantIdx],
                stock: Math.max(0, (variants[variantIdx].stock ?? 0) - it.quantity!),
              };
              const newTotal = variants.reduce((s, v) => s + (v.stock ?? 0), 0);
              await prisma.product.update({
                where: { id: it.productId! },
                data:  { variants: variants as object[], quantity: newTotal },
              });
              console.log(`[Inventory] Variant ${it.sku} stock: ${variants[variantIdx].stock}`);
            } else {
              // No variant match — just decrement top-level quantity
              await prisma.product.update({
                where: { id: it.productId! },
                data:  { quantity: { decrement: it.quantity! } },
              });
            }
          } catch (e) {
            console.error(`[Inventory] Failed for product ${it.productId}:`, (e as Error).message);
          }
        })
    );
    console.log(`[Inventory] Stock updated for ${orderItems.length} item(s) on order ${orderId}`);
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  return {
    success: true,
    message: `Label purchased! Tracking: ${result.trackingNumber}`,
    shipment: {
      trackingNumber: result.trackingNumber,
      labelBase64:    result.labelBase64,
      labelFormat:    result.labelFormat,
      cost:           result.cost,
    },
  };
}
