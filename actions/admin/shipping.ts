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

async function buildToAddress(orderId: string): Promise<ShipAddress | null> {
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      shippingAddress: true,
      physician: {
        select: {
          firstName: true, lastName: true, phone: true,
          addressOne: true, city: true, state: true, zipCode: true,
        },
      },
    },
  });
  if (!order) return null;

  const ph = order.physician;
  if (!ph) return null;

  const street = order.shippingAddress ?? ph.addressOne ?? "";
  return {
    name:    `Dr. ${ph.firstName} ${ph.lastName}`,
    street1: street,
    city:    ph.city    ?? "",
    state:   ph.state   ?? "",
    zip:     ph.zipCode ?? "",
    country: "US",
    phone:   ph.phone   ?? undefined,
  };
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
  carriers: CarrierCode[]
): Promise<{ rates: RateResult[]; error?: string }> {
  await requireAdmin();

  const from = getFromAddress();
  const to   = await buildToAddress(orderId);
  if (!to) return { rates: [], error: "Shipping address not found on this order." };

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
  service:     string
): Promise<{ success: boolean; message: string; shipment?: { trackingNumber: string; labelBase64: string; labelFormat: string; cost: number } }> {
  await requireAdmin();

  const from = getFromAddress();
  const to   = await buildToAddress(orderId);
  if (!to) return { success: false, message: "Shipping address not found." };

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

  // Update order with latest tracking info
  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber:  result.trackingNumber,
      shippingCarrier: `${result.carrierLabel} - ${result.service}`,
      status:          "SHIPPED",
    },
  });

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
