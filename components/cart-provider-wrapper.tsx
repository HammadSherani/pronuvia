"use client";

import { CartProvider } from "@/lib/cart/cart-context";

export function CartProviderWrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
