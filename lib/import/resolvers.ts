import "server-only";
import { prisma } from "@/lib/db/prisma";
import { toSlug } from "@/lib/utils/slug";
import type { ImportEntity } from "./types";

export type ImportIndexes = {
  categoryBySlug: Map<string, { id: string; name: string }>;
  subCategoryBySlug: Map<string, { id: string; categoryId: string }>;
  productSlugs: Set<string>;
  productSkus: Set<string>;
  productIdBySku: Map<string, { id: string; title: string }>;
  repIdByEmail: Map<string, string>;
  physicianIdByEmail: Map<string, { id: string; salesRepId: string | null; commission: number; uplineCommission: number }>;
  takenLoginIds: Set<string>;
  takenLicenses: Set<string>;
  couponCodes: Set<string>;
  orderNumbers: Set<string>;
  shippingRateKeys: Set<string>;
};

function emptyIndexes(): ImportIndexes {
  return {
    categoryBySlug: new Map(),
    subCategoryBySlug: new Map(),
    productSlugs: new Set(),
    productSkus: new Set(),
    productIdBySku: new Map(),
    repIdByEmail: new Map(),
    physicianIdByEmail: new Map(),
    takenLoginIds: new Set(),
    takenLicenses: new Set(),
    couponCodes: new Set(),
    orderNumbers: new Set(),
    shippingRateKeys: new Set(),
  };
}

async function loadCategoryBySlug(idx: ImportIndexes) {
  const rows = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  for (const r of rows) idx.categoryBySlug.set(r.slug, { id: r.id, name: r.name });
}

async function loadSubCategoryBySlug(idx: ImportIndexes) {
  const rows = await prisma.subCategory.findMany({ select: { id: true, slug: true, categoryId: true } });
  for (const r of rows) idx.subCategoryBySlug.set(r.slug, { id: r.id, categoryId: r.categoryId });
}

async function loadProductKeys(idx: ImportIndexes) {
  const rows = await prisma.product.findMany({ select: { id: true, slug: true, sku: true, title: true } });
  for (const r of rows) {
    idx.productSlugs.add(r.slug);
    idx.productSkus.add(r.sku);
    idx.productIdBySku.set(r.sku, { id: r.id, title: r.title });
  }
}

async function loadRepIdByEmail(idx: ImportIndexes) {
  const rows = await prisma.salesRepresentative.findMany({ select: { id: true, email: true } });
  for (const r of rows) idx.repIdByEmail.set(r.email.toLowerCase(), r.id);
}

async function loadPhysicianIdByEmail(idx: ImportIndexes) {
  const rows = await prisma.partneringPhysician.findMany({
    select: { id: true, email: true, salesRepId: true, commission: true, uplineCommission: true },
  });
  for (const r of rows) {
    idx.physicianIdByEmail.set(r.email.toLowerCase(), {
      id: r.id, salesRepId: r.salesRepId, commission: r.commission, uplineCommission: r.uplineCommission,
    });
  }
}

async function loadTakenLoginIds(idx: ImportIndexes) {
  const [physicians, reps] = await Promise.all([
    prisma.partneringPhysician.findMany({ where: { loginId: { not: null } }, select: { loginId: true } }),
    prisma.salesRepresentative.findMany({ where: { loginId: { not: null } }, select: { loginId: true } }),
  ]);
  for (const r of physicians) if (r.loginId) idx.takenLoginIds.add(r.loginId);
  for (const r of reps) if (r.loginId) idx.takenLoginIds.add(r.loginId);
}

async function loadTakenLicenses(idx: ImportIndexes) {
  const rows = await prisma.partneringPhysician.findMany({ where: { license: { not: null } }, select: { license: true } });
  for (const r of rows) if (r.license) idx.takenLicenses.add(r.license);
}

async function loadCouponCodes(idx: ImportIndexes) {
  const rows = await prisma.coupon.findMany({ select: { code: true } });
  for (const r of rows) idx.couponCodes.add(r.code.toUpperCase());
}

async function loadOrderNumbers(idx: ImportIndexes) {
  const rows = await prisma.order.findMany({ select: { orderNumber: true } });
  for (const r of rows) idx.orderNumbers.add(r.orderNumber);
}

export function shippingRateKey(country: string, method: string, states: string[]): string {
  return `${country}|${method}|${[...states].sort().join(",")}`;
}

async function loadShippingRateKeys(idx: ImportIndexes) {
  const rows = await prisma.shippingRate.findMany({ select: { country: true, method: true, states: true } });
  for (const r of rows) idx.shippingRateKeys.add(shippingRateKey(r.country, r.method, r.states));
}

/** Builds only the indexes a given entity's import actually needs, once per run. */
export async function buildImportIndexes(entity: ImportEntity): Promise<ImportIndexes> {
  const idx = emptyIndexes();

  switch (entity) {
    case "category":
      await loadCategoryBySlug(idx);
      break;
    case "subCategory":
      await loadCategoryBySlug(idx);
      await loadSubCategoryBySlug(idx);
      break;
    case "product":
      await Promise.all([loadCategoryBySlug(idx), loadSubCategoryBySlug(idx), loadProductKeys(idx)]);
      break;
    case "coupon":
      await loadCouponCodes(idx);
      break;
    case "shippingRate":
      await loadShippingRateKeys(idx);
      break;
    case "salesRep":
      await Promise.all([loadTakenLoginIds(idx), loadRepIdByEmail(idx)]);
      break;
    case "physician":
      await Promise.all([loadTakenLoginIds(idx), loadTakenLicenses(idx), loadRepIdByEmail(idx), loadPhysicianIdByEmail(idx)]);
      break;
    case "order":
      await Promise.all([loadPhysicianIdByEmail(idx), loadRepIdByEmail(idx), loadProductKeys(idx), loadOrderNumbers(idx)]);
      break;
  }

  return idx;
}

export function resolveCategory(idx: ImportIndexes, name: string) {
  return idx.categoryBySlug.get(toSlug(name)) ?? null;
}

export function resolveSubCategory(idx: ImportIndexes, name: string, expectedCategoryId: string) {
  const sub = idx.subCategoryBySlug.get(toSlug(name));
  if (!sub) return { found: false as const };
  if (sub.categoryId !== expectedCategoryId) return { found: true as const, wrongCategory: true as const, sub };
  return { found: true as const, wrongCategory: false as const, sub };
}
