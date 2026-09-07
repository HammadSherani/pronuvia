export function deriveProductFields(variants: { sku?: string; salePrice?: number; costPrice?: number; stock?: number }[]) {
  const salePrices = variants.map((v) => v.salePrice ?? 0).filter((p) => p > 0);
  const costPrices = variants.map((v) => v.costPrice ?? 0).filter((p) => p > 0);
  return {
    sku:       variants[0]?.sku?.trim() || `PRN-${Date.now().toString(36).toUpperCase()}`,
    salePrice: salePrices.length ? Math.min(...salePrices) : 0,
    costPrice: costPrices.length ? Math.min(...costPrices) : 0,
    quantity:  variants.reduce((s, v) => s + (v.stock ?? 0), 0),
    discount:  0,
    compareAtPrice: null,
    gtin:      null,
    weight:    null,
    weightUnit: "kg",
  };
}
