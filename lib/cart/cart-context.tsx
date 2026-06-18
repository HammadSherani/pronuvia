"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type CartItem = {
  cartId:       string;
  productId:    string;
  productTitle: string;
  productSlug:  string;
  productImage: string | null;
  variantSize:  string;
  variantSku:   string;
  unitPrice:    number;
  quantity:     number;
};

type CartContextValue = {
  items:      CartItem[];
  addItem:    (item: Omit<CartItem, "cartId">) => void;
  removeItem: (cartId: string) => void;
  updateQty:  (cartId: string, qty: number) => void;
  clearCart:  () => void;
  totalItems: number;
  totalPrice: number;
};

const CartCtx = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "pronuvia_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items,    setItems]    = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const didRead = useRef(false);

  // Read from localStorage once on mount
  useEffect(() => {
    if (didRead.current) return;
    didRead.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  // Persist on every change after hydration
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "cartId">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && i.variantSize === item.variantSize
      );
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      const cartId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return [...prev, { ...item, cartId }];
    });
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQty = useCallback((cartId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => i.cartId === cartId ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <CartCtx.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
