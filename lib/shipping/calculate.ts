"use server";

import { prisma } from "@/lib/db/prisma";
import { ShippingMethod } from "@/generated/prisma/enums";

export type ShippingOption = {
  id:     string;
  method: ShippingMethod;
  label:  string;
  cost:   number;
  scope:  "state" | "country"; // for sorting priority
};

const METHOD_LABELS: Record<ShippingMethod, string> = {
  FLAT:         "Flat Rate Shipping",
  FREE:         "Free Shipping",
  LOCAL_PICKUP: "Local Pickup",
};

/**
 * Returns all active shipping options applicable to the given country + state.
 *
 * Priority:
 *   1. State-specific rules (states[] contains stateCode) — shown first
 *   2. Country-wide rules  (states[] is empty)            — shown as fallback
 *
 * If there are state-specific rules the country-wide rules are still included
 * so the admin/customer can see all available options.
 */
export async function getShippingOptionsForCountry(
  countryCode: string,
  stateCode?: string,
): Promise<ShippingOption[]> {
  if (!countryCode) return [];

  const allRates = await prisma.shippingRate.findMany({
    where:   { country: countryCode, isActive: true },
    orderBy: { method: "asc" },
    select:  { id: true, method: true, cost: true, states: true },
  });

  const stateSpecific: ShippingOption[] = [];
  const countryWide:   ShippingOption[] = [];

  for (const r of allRates) {
    if (r.states.length === 0) {
      // Country-wide rule
      countryWide.push({ id: r.id, method: r.method, label: METHOD_LABELS[r.method], cost: r.cost, scope: "country" });
    } else if (stateCode && r.states.includes(stateCode)) {
      // State-specific rule that matches the customer's state
      stateSpecific.push({ id: r.id, method: r.method, label: METHOD_LABELS[r.method], cost: r.cost, scope: "state" });
    }
  }

  // State-specific rules first, then country-wide
  return [...stateSpecific, ...countryWide];
}
