export type ShippingTier = {
  rate:          number;
  label:         string;
  estimatedDays: number;
};

export function calculateShipping(subtotal: number): ShippingTier {
  if (subtotal >= 150) return { rate: 0,    label: "Free Standard Shipping", estimatedDays: 7 };
  if (subtotal >= 75)  return { rate: 4.99, label: "Standard Shipping",      estimatedDays: 7 };
  return                      { rate: 9.99, label: "Standard Shipping",      estimatedDays: 7 };
}

export function estimatedDeliveryDate(days: number): Date {
  const d = new Date();
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  return d;
}
