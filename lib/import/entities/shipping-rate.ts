import "server-only";
import { prisma } from "@/lib/db/prisma";
import { str, num, bool, list } from "@/lib/import/coerce";
import { ImportShippingRateSchema } from "@/lib/import/schemas";
import { resolveCountry, resolveState } from "@/lib/import/address";
import { continentForCountryCode } from "@/lib/shipping/continents";
import { shippingRateKey } from "@/lib/import/resolvers";
import { ShippingMethod } from "@/generated/prisma/enums";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenKeys = new Map<string, number>();

  for (const { row, mapped } of rows) {
    const parsed = ImportShippingRateSchema.safeParse({
      country: str(mapped.country),
      states: list(mapped.states),
      method: str(mapped.method)?.toUpperCase(),
      cost: num(mapped.cost) ?? 0,
      isActive: bool(mapped.isActive, true),
      continent: str(mapped.continent),
    });
    if (!parsed.success) {
      results.push({ row, status: "error", errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }

    const data = parsed.data;
    const errors: string[] = [];

    const country = resolveCountry(data.country);
    if (!country) errors.push(`Country "${data.country}" not recognized.`);

    const cost = data.method === "FLAT" ? data.cost : 0;
    if (data.method === "FLAT" && (!cost || cost <= 0)) errors.push("Cost is required (> 0) when Method is FLAT.");

    if (errors.length) {
      results.push({ row, status: "error", errors, preview: { country: data.country, method: data.method } });
      continue;
    }

    const stateResolved = data.states.map((s) => resolveState(s, country!.code));
    const stateCodes = stateResolved.map((s) => s.code);
    const stateNames = stateResolved.map((s) => s.name);
    const continent = data.continent || continentForCountryCode(country!.code) || "Americas";

    const key = shippingRateKey(country!.code, data.method, stateCodes);
    const preview = { country: country!.name, states: stateNames.join(", "), method: data.method, cost };

    if (ctx.indexes.shippingRateKeys.has(key)) {
      results.push({ row, status: "error", errors: [`A shipping rule already exists for ${stateNames.length ? stateNames.join(", ") : country!.name} with ${data.method}.`], preview });
      continue;
    }
    if (seenKeys.has(key)) {
      results.push({ row, status: "error", errors: [`Duplicate of row ${seenKeys.get(key)} in this file.`], preview });
      continue;
    }
    seenKeys.set(key, row);

    if (!ctx.commit) {
      results.push({ row, status: "ok", preview });
      continue;
    }

    await prisma.shippingRate.create({
      data: {
        continent, country: country!.code, countryName: country!.name,
        states: stateCodes, stateNames, method: data.method as ShippingMethod,
        cost, isActive: data.isActive,
      },
    });
    ctx.indexes.shippingRateKeys.add(key);
    results.push({ row, status: "ok", preview });
  }

  return results;
}
